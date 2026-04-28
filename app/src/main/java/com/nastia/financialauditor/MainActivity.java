package com.nastia.financialauditor;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.view.*;
import android.widget.*;

import java.io.*;
import java.text.DecimalFormat;
import java.util.*;

public class MainActivity extends Activity {
    private static final String PREFS = "auditor_prefs";
    private static final String KEY_AGREED = "user_agreed";
    private static final String KEY_DARK = "dark_theme";
    private static final String KEY_SETUP_DONE = "initial_setup_done";
    /** Совпадает с DataStore.DB_VERSION: при смене схемы / destructive reset нужна повторная настройка. */
    private static final String KEY_SETUP_SCHEMA_VERSION = "setup_schema_version";

    private DataStore store;
    private LinearLayout content;
    private final DecimalFormat money = new DecimalFormat("#,##0.## ₽");
    private boolean dark;

    private final String[] typeLabels = {"Доход", "Расход", "Перевод в фонд", "Расход из фонда", "Платёж по кредиту", "Увеличение долга", "Перевод на маркетплейс"};
    private final String[] typeCodes = {DataStore.OP_INCOME, DataStore.OP_EXPENSE, DataStore.OP_TRANSFER_TO_FUND, DataStore.OP_EXPENSE_FROM_FUND, DataStore.OP_CREDIT_PAYMENT, DataStore.OP_DEBT_INCREASE, DataStore.OP_MARKETPLACE_TRANSFER};
    private final String[] expenseCategories = {"ЖКХ, налоги, телефоны, интернет", "Дети", "Продукты, еда вне дома", "Бытовая химия, товары для дома", "Красота, здоровье", "Одежда, обувь, аксессуары", "Разное и форс-мажор", "Транспорт, авто", "Подарки и благотворительность", "Хочушки-удовольствия"};
    private final String[] incomeCategories = {"Зарплата", "Аренда", "Алименты", "Пособия", "Фриланс", "Продажа вещей", "Подарок", "Проценты и доход на остаток", "Кэшбэк / бонусы"};
    private final String[] creditCategories = {"Увеличение долга", "Страховка кредитора", "Покупка в кредит", "Комиссия / проценты"};
    private final String[] cardTypes = {"Дебетовая", "Кредитная"};
    private final String[] cardTypeCodes = {DataStore.TYPE_DEBIT, DataStore.TYPE_CREDIT};
    private final String[] currencies = {"RUB", "USD", "EUR"};

    @Override protected void onCreate(Bundle b) {
        dark = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_DARK, false);
        setTheme(dark ? R.style.AppTheme_Dark : R.style.AppTheme_Light);
        super.onCreate(b);
        store = new DataStore(this);
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        // Прототип: после destructive onUpgrade в БД снова сид, а флаг настройки мог остаться true;
        // сверка с версией схемы снова показывает первичную настройку.
        if (prefs.getInt(KEY_SETUP_SCHEMA_VERSION, -1) != DataStore.DB_VERSION) {
            prefs.edit().putBoolean(KEY_SETUP_DONE, false).apply();
        }
        buildUi();
        if (!prefs.getBoolean(KEY_AGREED, false)) showAgreement(false);
        else if (!prefs.getBoolean(KEY_SETUP_DONE, false)) showInitialSetup();
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(26, 28, 26, 40);
        content.setBackgroundColor(dark ? Color.rgb(25,23,23) : Color.rgb(245,241,234));
        scroll.addView(content);
        setContentView(scroll);
        renderHome();
    }

    private TextView tv(String text, int sp, int style) {
        TextView v = new TextView(this);
        v.setText(text); v.setTextSize(sp); v.setTypeface(null, style);
        v.setTextColor(dark ? Color.rgb(245,241,234) : Color.rgb(45,42,42));
        v.setPadding(0, 8, 0, 8);
        return v;
    }
    private Button btn(String text) { Button b = new Button(this); b.setText(text); b.setAllCaps(false); return b; }

    private void renderHome() {
        content.removeAllViews();
        LinearLayout top = new LinearLayout(this); top.setOrientation(LinearLayout.HORIZONTAL); top.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = tv("Личный финансовый аудитор", 24, 1); top.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        Button theme = btn(dark ? "Светлая" : "Тёмная");
        theme.setOnClickListener(v -> { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_DARK, !dark).apply(); recreate(); });
        top.addView(theme); content.addView(top);
        content.addView(tv("Ясность без давления. Управление без жёсткости.", 14, 0));

        DataStore.Summary s = store.getSummary();
        addCard("Текущее состояние", "Карты: " + money.format(s.cardBalance)
                + "\nНаличные: " + money.format(s.cashBalance)
                + "\nМаркетплейс-кошельки: " + money.format(s.marketplaceBalance)
                + "\nФонды: " + money.format(s.fundsTotal)
                + "\nДолг: " + money.format(s.debt));
        addCard("Месяц", "Доходы: " + money.format(s.totalIncome) + "\nРасходы: " + money.format(s.totalExpense) + "\nЧисто: " + money.format(s.totalIncome - s.totalExpense));
        addRecommendation(s);

        Button add = btn("+ Добавить операцию"); add.setOnClickListener(v -> showOperationDialog()); content.addView(add);
        Button export = btn("Экспорт CSV"); export.setOnClickListener(v -> exportCsv()); content.addView(export);
        Button setup = btn("Настройки финансовой системы"); setup.setOnClickListener(v -> showInitialSetup()); content.addView(setup);
        Button agreement = btn("Пользовательское соглашение"); agreement.setOnClickListener(v -> showAgreement(true)); content.addView(agreement);
        content.addView(tv("Последние операции", 20, 1));
        for (DataStore.OperationView op : store.recentOperations()) addOperationRow(op);
    }

    private void addCard(String title, String body) {
        TextView box = tv(title + "\n" + body, 16, 0);
        box.setBackgroundColor(dark ? Color.rgb(49,67,85) : Color.rgb(216,206,194));
        box.setPadding(24, 20, 24, 20);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0,12,0,12); content.addView(box, lp);
    }

    private void addRecommendation(DataStore.Summary s) {
        String text;
        if (s.debt > 0 && s.totalIncome > 0) text = "Подсказка: долг виден отдельно от свободных денег. Можно выбрать комфортный платёж выше минимального и двигаться без рывков.";
        else if (s.totalIncome > 0 && s.fundsTotal == 0) text = "Подсказка: проценты фондов пока служат ориентиром. Автораспределение доходов добавим отдельной итерацией.";
        else text = "Подсказка: система не запрещает операции, а помогает видеть картину без двойного учёта.";
        addCard("Мягкая рекомендация", text);
    }

    private void addOperationRow(DataStore.OperationView op) {
        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.VERTICAL); row.setPadding(18,16,18,16); row.setBackgroundColor(dark ? Color.rgb(45,42,42) : Color.WHITE);
        row.addView(tv(labelForType(op.type) + " • " + money.format(op.amount), 16, 1));
        List<String> details = new ArrayList<>(); details.add(op.date);
        if (notEmpty(op.account)) details.add("Источник: " + op.account);
        if (notEmpty(op.targetAccount)) details.add("Куда: " + op.targetAccount);
        if (notEmpty(op.fund)) details.add("Фонд: " + op.fund);
        if (notEmpty(op.creditName)) details.add("Кредит: " + op.creditName);
        if (notEmpty(op.category)) details.add("Категория: " + op.category);
        row.addView(tv(join(details, " • ") + (notEmpty(op.comment) ? "\n" + op.comment : ""), 13, 0));
        Button del = btn("Удалить"); del.setOnClickListener(v -> { store.deleteOperation(op.id); renderHome(); }); row.addView(del);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0,8,0,8); content.addView(row, lp);
    }

    private void showOperationDialog() {
        Dialog d = new Dialog(this); d.setTitle("Новая операция");
        ScrollView sv = new ScrollView(this); LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(26, 22, 26, 22); sv.addView(box);
        Spinner type = spinner(typeLabels);
        EditText amount = input("Сумма"); amount.setInputType(8194);
        Spinner incomeMode = spinner(new String[]{"На карту/кошелёк", "В фонд"});
        Spinner account = spinnerItems(store.getActiveExpenseSources(), true);
        Spinner targetWallet = spinnerItems(store.getActiveMarketplaceWallets(), true);
        Spinner fund = spinnerItems(store.getOperationFunds(), true);
        Spinner credit = spinnerItems(store.getCredits(), true);
        Spinner category = spinner(expenseCategories);
        EditText comment = input("Комментарий");

        TextView lType = label("Тип операции"), lAmount = label("Сумма"), lMode = label("Куда пришёл доход"), lAccount = label("Карта / наличные / кошелёк"), lTarget = label("Кошелёк маркетплейса"), lFund = label("Фонд"), lCredit = label("Кредит"), lCategory = label("Категория"), lComment = label("Комментарий");
        box.addView(lType); box.addView(type); box.addView(lAmount); box.addView(amount);
        box.addView(lMode); box.addView(incomeMode); box.addView(lAccount); box.addView(account); box.addView(lTarget); box.addView(targetWallet); box.addView(lFund); box.addView(fund); box.addView(lCredit); box.addView(credit); box.addView(lCategory); box.addView(category); box.addView(lComment); box.addView(comment);
        Button save = btn("Сохранить"); box.addView(save); Button saveMore = btn("Сохранить и добавить ещё"); box.addView(saveMore);

        Runnable refresh = () -> configureOperationFields(typeCodes[type.getSelectedItemPosition()], incomeMode.getSelectedItemPosition(), incomeMode, account, targetWallet, fund, credit, category, lMode, lAccount, lTarget, lFund, lCredit, lCategory);
        type.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){ public void onItemSelected(android.widget.AdapterView<?> p, View v, int pos, long id){ refresh.run(); } public void onNothingSelected(android.widget.AdapterView<?> p){} });
        incomeMode.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){ public void onItemSelected(android.widget.AdapterView<?> p, View v, int pos, long id){ refresh.run(); } public void onNothingSelected(android.widget.AdapterView<?> p){} });
        refresh.run();

        View.OnClickListener saver = v -> {
            double a = parseRequired(amount, "Введите положительную сумму"); if (a <= 0) return;
            String code = typeCodes[type.getSelectedItemPosition()];
            long accId = selectedId(account), targetId = selectedId(targetWallet), fundId = selectedId(fund), creditId = selectedId(credit);
            String cat = category.getVisibility() == View.VISIBLE ? (String) category.getSelectedItem() : "";

            if (DataStore.OP_INCOME.equals(code)) {
                if (incomeMode.getSelectedItemPosition() == 0) { if (accId <= 0) { toast("Выберите, куда пришёл доход"); return; } fundId = 0; }
                else { if (fundId <= 0) { toast("Выберите фонд для дохода"); return; } accId = 0; }
                creditId = 0; targetId = 0;
            } else if (DataStore.OP_EXPENSE.equals(code)) {
                if (accId <= 0) { toast("Выберите источник расхода"); return; }
                fundId = 0; creditId = 0; targetId = 0;
            } else if (DataStore.OP_TRANSFER_TO_FUND.equals(code)) {
                if (accId <= 0) { toast("Выберите источник перевода"); return; }
                if (fundId <= 0) { toast("Выберите фонд"); return; }
                creditId = 0; targetId = 0; cat = "";
            } else if (DataStore.OP_EXPENSE_FROM_FUND.equals(code)) {
                if (fundId <= 0) { toast("Выберите фонд"); return; }
                accId = 0; creditId = 0; targetId = 0; cat = "";
            } else if (DataStore.OP_CREDIT_PAYMENT.equals(code)) {
                if (accId <= 0) { toast("Выберите источник платежа"); return; }
                if (creditId <= 0) { toast("Выберите кредит"); return; }
                fundId = 0; targetId = 0; cat = "";
            } else if (DataStore.OP_DEBT_INCREASE.equals(code)) {
                if (creditId <= 0) { toast("Выберите кредит"); return; }
                accId = 0; fundId = 0; targetId = 0;
            } else if (DataStore.OP_MARKETPLACE_TRANSFER.equals(code)) {
                if (accId <= 0) { toast("Выберите карту-источник"); return; }
                if (targetId <= 0) { toast("Выберите маркетплейс-кошелёк"); return; }
                String accountType = store.accountType(accId);
                // Пополнение маркетплейса с кредитки увеличивает долг, но не считается расходом месяца.
                if (DataStore.TYPE_CREDIT.equals(accountType)) {
                    creditId = store.creditIdForAccount(accId);
                    if (creditId <= 0) { toast("Для кредитной карты не найден кредит"); return; }
                } else creditId = 0;
                fundId = 0; cat = "";
            }

            store.addOperation(code, a, accId, targetId, fundId, creditId, cat, comment.getText().toString());
            toast("Операция сохранена"); amount.setText(""); comment.setText(""); renderHome(); if (v == save) d.dismiss(); else amount.requestFocus();
        };
        save.setOnClickListener(saver); saveMore.setOnClickListener(saver);
        d.setContentView(sv); d.show();
    }

    private void configureOperationFields(String code, int incomeModePos, Spinner incomeMode, Spinner account, Spinner targetWallet, Spinner fund, Spinner credit, Spinner category, TextView lMode, TextView lAccount, TextView lTarget, TextView lFund, TextView lCredit, TextView lCategory) {
        setVisible(lMode, incomeMode, false); setVisible(lAccount, account, false); setVisible(lTarget, targetWallet, false); setVisible(lFund, fund, false); setVisible(lCredit, credit, false); setVisible(lCategory, category, false);
        lCategory.setText("Категория");
        if (DataStore.OP_INCOME.equals(code)) {
            setVisible(lMode, incomeMode, true);
            if (incomeModePos == 0) { setSpinnerItems(account, store.getActiveIncomeDestinations(), true); setVisible(lAccount, account, true); lAccount.setText("Куда пришёл доход"); }
            else { setSpinnerItems(fund, store.getOperationFunds(), true); setVisible(lFund, fund, true); lFund.setText("Фонд-получатель"); }
            setCategory(category, incomeCategories); setVisible(lCategory, category, true);
        } else if (DataStore.OP_EXPENSE.equals(code)) {
            setSpinnerItems(account, store.getActiveExpenseSources(), true); setVisible(lAccount, account, true); lAccount.setText("Источник расхода"); setCategory(category, expenseCategories); setVisible(lCategory, category, true);
        } else if (DataStore.OP_TRANSFER_TO_FUND.equals(code)) {
            setSpinnerItems(account, store.getActiveFundTransferSources(), true); setSpinnerItems(fund, store.getOperationFunds(), true); setVisible(lAccount, account, true); lAccount.setText("Откуда перевести"); setVisible(lFund, fund, true); lFund.setText("Куда: фонд");
        } else if (DataStore.OP_EXPENSE_FROM_FUND.equals(code)) {
            setSpinnerItems(fund, store.getOperationFunds(), true); setVisible(lFund, fund, true); lFund.setText("Фонд");
        } else if (DataStore.OP_CREDIT_PAYMENT.equals(code)) {
            setSpinnerItems(account, store.getActiveFundTransferSources(), true); setVisible(lAccount, account, true); lAccount.setText("Источник платежа"); setVisible(lCredit, credit, true);
        } else if (DataStore.OP_DEBT_INCREASE.equals(code)) {
            setVisible(lCredit, credit, true); setCategory(category, creditCategories); setVisible(lCategory, category, true); lCategory.setText("Причина роста долга");
        } else if (DataStore.OP_MARKETPLACE_TRANSFER.equals(code)) {
            setSpinnerItems(account, store.getActiveMarketplaceTransferSources(), true); setSpinnerItems(targetWallet, store.getActiveMarketplaceWallets(), true); setVisible(lAccount, account, true); lAccount.setText("Карта-источник"); setVisible(lTarget, targetWallet, true);
        }
    }

    private void showInitialSetup() {
        boolean editMode = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_SETUP_DONE, false);
        Dialog d = new Dialog(this); d.setTitle(editMode ? "Настройки финансовой системы" : "Первичная настройка");
        ScrollView sv = new ScrollView(this); LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(24, 20, 24, 24); sv.addView(box);
        box.addView(tv(editMode
                ? "Можно поправить карты, кошельки, наличные и фонды. Уже внесённые операции не удаляются. Балансы в настройке — базовые значения, операции учитываются отдельно."
                : "Настроим финансовую систему. Можно оставить предустановленные значения и вернуться к ним позже.", 15, 0));
        box.addView(tv("Не обязательно включать все фонды сразу. Часто спокойнее выбрать 2–4 главных направления и быстрее увидеть результат.", 14, 0));

        List<DataStore.AccountConfig> existingAccounts = store.getAccountsForSetup();
        List<DataStore.AccountConfig> cardConfigs = new ArrayList<>();
        DataStore.AccountConfig cashConfig = null, ozonConfig = null, wbConfig = null;
        for (DataStore.AccountConfig c : existingAccounts) {
            if (DataStore.TYPE_CASH.equals(c.type) && cashConfig == null) cashConfig = c;
            else if (DataStore.TYPE_MARKETPLACE.equals(c.type)) {
                String n = c.name == null ? "" : c.name.toLowerCase(Locale.ROOT);
                if (n.contains("ozon") || n.contains("озон")) ozonConfig = c;
                else if (n.contains("wb") || n.contains("wildberries") || n.contains("вайлд")) wbConfig = c;
            } else if (DataStore.TYPE_DEBIT.equals(c.type) || DataStore.TYPE_CREDIT.equals(c.type)) cardConfigs.add(c);
        }
        while (cardConfigs.size() < 5) cardConfigs.add(defaultAccount("Карта" + (cardConfigs.size()+1), cardConfigs.isEmpty(), DataStore.TYPE_DEBIT, "RUB"));
        if (cashConfig == null) cashConfig = defaultAccount("Наличные", true, DataStore.TYPE_CASH, "RUB");
        if (ozonConfig == null) ozonConfig = defaultAccount("Ozon-кошелёк", false, DataStore.TYPE_MARKETPLACE, "RUB");
        if (wbConfig == null) wbConfig = defaultAccount("WB-кошелёк", false, DataStore.TYPE_MARKETPLACE, "RUB");

        box.addView(tv("Карты", 20, 1));
        List<AccountSetupRow> cardRows = new ArrayList<>();
        for (int i=0; i<5; i++) { AccountSetupRow r = new AccountSetupRow(cardConfigs.get(i), false); cardRows.add(r); box.addView(r.view); }
        box.addView(tv("Наличные", 20, 1));
        AccountSetupRow cashRow = new AccountSetupRow(cashConfig, true); box.addView(cashRow.view);
        box.addView(tv("Маркетплейс-кошельки", 20, 1));
        box.addView(tv("Кошельки Ozon/WB — это платёжные контейнеры, а не фонды. Баланс можно указать сейчас или оставить пустым.", 14, 0));
        AccountSetupRow ozon = new AccountSetupRow(ozonConfig, true); box.addView(ozon.view);
        AccountSetupRow wb = new AccountSetupRow(wbConfig, true); box.addView(wb.view);

        box.addView(tv("Фонды", 20, 1));
        List<FundSetupRow> fundRows = new ArrayList<>();
        List<DataStore.FundConfig> existingFunds = store.getFundsForSetup();
        if (existingFunds.isEmpty()) {
            addDefaultFundRow(box, fundRows, "Продукты и Быт", true, 0, 0, 41, true, "operational");
            addDefaultFundRow(box, fundRows, "Съём и Маневренный фонд", true, 200000, 0, 35, false, "goal");
            addDefaultFundRow(box, fundRows, "Подушка Безопасности", true, 1250000, 0, 5, false, "goal");
            addDefaultFundRow(box, fundRows, "Фонд Финансовой цели года", true, 500000, 0, 5, false, "goal");
            addDefaultFundRow(box, fundRows, "Фонд Удовольствий", true, 0, 0, 4, false, "regular");
            addDefaultFundRow(box, fundRows, "Фонд Больших Покупок", true, 0, 0, 4, false, "regular");
            addDefaultFundRow(box, fundRows, "Фонд Собственного Жилья", true, 10000000, 0, 3, false, "goal");
            addDefaultFundRow(box, fundRows, "Фонд Инвестиций", true, 0, 0, 3, false, "regular");
            addDefaultFundRow(box, fundRows, "Фонд9", false, 0, 0, 0, false, "regular");
            addDefaultFundRow(box, fundRows, "Фонд10", false, 0, 0, 0, false, "regular");
        } else {
            for (DataStore.FundConfig fc : existingFunds) { FundSetupRow r = new FundSetupRow(fc); fundRows.add(r); box.addView(r.view); }
        }

        Button save = btn(editMode ? "Сохранить изменения" : "Сохранить настройку"); box.addView(save);
        save.setOnClickListener(v -> {
            List<DataStore.AccountConfig> accounts = new ArrayList<>();
            for (AccountSetupRow r : cardRows) { DataStore.AccountConfig c = r.toConfig(); if (c == null) return; accounts.add(c); }
            DataStore.AccountConfig cash = cashRow.toConfig(); if (cash == null) return; accounts.add(cash);
            DataStore.AccountConfig o = ozon.toConfig(); if (o == null) return; accounts.add(o);
            DataStore.AccountConfig w = wb.toConfig(); if (w == null) return; accounts.add(w);
            List<DataStore.FundConfig> funds = new ArrayList<>();
            for (FundSetupRow r : fundRows) { DataStore.FundConfig fc = r.toConfig(); if (fc == null) return; funds.add(fc); }
            store.saveInitialSetup(accounts, funds);
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putBoolean(KEY_SETUP_DONE, true)
                    .putInt(KEY_SETUP_SCHEMA_VERSION, DataStore.DB_VERSION)
                    .apply();
            toast(editMode ? "Изменения сохранены" : "Настройка сохранена"); d.dismiss(); renderHome();
        });
        d.setContentView(sv); d.show();
    }

    private DataStore.AccountConfig defaultAccount(String name, boolean active, String type, String currency) {
        DataStore.AccountConfig c = new DataStore.AccountConfig();
        c.id = 0; c.name = name; c.active = active; c.type = type; c.currency = currency;
        c.balance = 0; c.currentDebt = 0; c.creditLimit = 0;
        return c;
    }

    private void addDefaultFundRow(LinearLayout box, List<FundSetupRow> list, String name, boolean active, double target, double current, double percent, boolean operational, String type) {
        DataStore.FundConfig f = new DataStore.FundConfig();
        f.name = name; f.active = active; f.targetAmount = target; f.initialBalance = current; f.plannedPercent = percent; f.operational = operational; f.type = type;
        FundSetupRow r = new FundSetupRow(f); list.add(r); box.addView(r.view);
    }

    private class AccountSetupRow {
        LinearLayout view = new LinearLayout(MainActivity.this);
        CheckBox active = new CheckBox(MainActivity.this);
        EditText name = input("Название");
        Spinner type = spinner(cardTypes);
        Spinner currency = spinner(currencies);
        EditText balance = input("Баланс");
        EditText debt = input("Текущая задолженность");
        EditText limit = input("Кредитный лимит");
        TextView lType = label("Тип карты"), lCurrency = label("Валюта"), lBalance = label("Баланс"), lDebt = label("Текущая задолженность"), lLimit = label("Кредитный лимит"), lName = label("Название");
        long id; boolean fixedType; String fixedTypeCode;

        AccountSetupRow(DataStore.AccountConfig config, boolean fixedType) {
            this.id = config.id; this.fixedType = fixedType; this.fixedTypeCode = config.type;
            view.setOrientation(LinearLayout.VERTICAL); view.setPadding(0, 8, 0, 14);
            active.setText("Активно"); active.setChecked(config.active);
            name.setText(config.name == null ? "" : config.name);
            balance.setInputType(8194); debt.setInputType(8194); limit.setInputType(8194);
            if (config.balance > 0) balance.setText(String.valueOf((long)config.balance));
            if (config.currentDebt > 0) debt.setText(String.valueOf((long)config.currentDebt));
            if (config.creditLimit > 0) limit.setText(String.valueOf((long)config.creditLimit));
            if (DataStore.TYPE_CREDIT.equals(config.type)) type.setSelection(1); else type.setSelection(0);
            if ("USD".equals(config.currency)) currency.setSelection(1); else if ("EUR".equals(config.currency)) currency.setSelection(2);

            view.addView(active); view.addView(lName); view.addView(name);
            if (!fixedType) { view.addView(lType); view.addView(type); }
            view.addView(lCurrency); view.addView(currency);
            view.addView(lBalance); view.addView(balance); view.addView(lDebt); view.addView(debt); view.addView(lLimit); view.addView(limit);
            Runnable refresh = () -> {
                String currentType = fixedType ? fixedTypeCode : cardTypeCodes[type.getSelectedItemPosition()];
                boolean credit = DataStore.TYPE_CREDIT.equals(currentType);
                boolean marketplace = DataStore.TYPE_MARKETPLACE.equals(currentType);
                lBalance.setText(marketplace ? "Баланс кошелька на момент настройки (необязательно)" : "Баланс на момент настройки");
                setVisible(lBalance, balance, !credit);
                setVisible(lDebt, debt, credit);
                setVisible(lLimit, limit, credit);
            };
            type.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){ public void onItemSelected(android.widget.AdapterView<?> p, View v, int pos, long id){ refresh.run(); } public void onNothingSelected(android.widget.AdapterView<?> p){} }); refresh.run();
        }

        DataStore.AccountConfig toConfig() {
            DataStore.AccountConfig c = new DataStore.AccountConfig();
            c.id = id;
            c.name = name.getText().toString().trim().isEmpty() ? "Без названия" : name.getText().toString().trim();
            c.active = active.isChecked(); c.currency = (String)currency.getSelectedItem();
            c.type = fixedType ? fixedTypeCode : cardTypeCodes[type.getSelectedItemPosition()];
            if (c.active && DataStore.TYPE_CREDIT.equals(c.type)) {
                c.currentDebt = parseRequired(debt, "Укажите задолженность для " + c.name); if (c.currentDebt < 0) return null;
                c.creditLimit = parseRequired(limit, "Укажите лимит для " + c.name); if (c.creditLimit < 0) return null;
                c.balance = 0;
            } else {
                if (c.active && (DataStore.TYPE_DEBIT.equals(c.type) || DataStore.TYPE_CASH.equals(c.type))) {
                    c.balance = parseRequired(balance, "Укажите баланс для " + c.name); if (c.balance < 0) return null;
                } else c.balance = parseOptional(balance);
                c.currentDebt = 0; c.creditLimit = 0;
            }
            return c;
        }
    }

    private class FundSetupRow {
        LinearLayout view = new LinearLayout(MainActivity.this);
        CheckBox active = new CheckBox(MainActivity.this);
        EditText name = input("Название фонда");
        EditText target = input("Целевая сумма");
        EditText current = input("Текущий баланс фонда");
        EditText percent = input("% распределения");
        long id; boolean operational; String typeCode;

        FundSetupRow(DataStore.FundConfig config) {
            this.id = config.id; this.operational = config.operational; this.typeCode = config.type == null ? (config.operational ? "operational" : "goal") : config.type;
            view.setOrientation(LinearLayout.VERTICAL); view.setPadding(0, 8, 0, 14);
            active.setText("Активен"); active.setChecked(config.active);
            name.setText(config.name == null ? "" : config.name);
            target.setInputType(8194); current.setInputType(8194); percent.setInputType(8194);
            if (config.targetAmount > 0) target.setText(String.valueOf((long)config.targetAmount));
            if (config.initialBalance > 0) current.setText(String.valueOf((long)config.initialBalance));
            if (config.plannedPercent > 0) percent.setText(String.valueOf((long)config.plannedPercent));
            view.addView(active);
            view.addView(label("Название фонда")); view.addView(name);
            view.addView(label("Целевая сумма (необязательно)")); view.addView(target);
            view.addView(label("Уже накоплено на момент настройки (необязательно)")); view.addView(current);
            view.addView(label("% распределения дохода (ориентир, не автоперевод)")); view.addView(percent);
        }
        DataStore.FundConfig toConfig(){
            DataStore.FundConfig f = new DataStore.FundConfig();
            f.id = id;
            f.name = name.getText().toString().trim().isEmpty()?"Фонд":name.getText().toString().trim();
            f.active = active.isChecked();
            f.targetAmount = parseOptional(target);
            f.initialBalance = parseOptional(current);
            f.plannedPercent = parseOptional(percent);
            f.operational = operational;
            f.type = typeCode;
            return f;
        }
    }

    private TextView label(String s){ return tv(s, 13, 1); }
    private EditText input(String hint){ EditText e = new EditText(this); e.setHint(hint); e.setSingleLine(false); e.setTextColor(dark ? Color.WHITE : Color.BLACK); e.setHintTextColor(dark ? Color.LTGRAY : Color.DKGRAY); return e; }
    private Spinner spinner(String[] values){ Spinner sp = new Spinner(this); sp.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, values)); return sp; }
    private Spinner spinnerItems(List<DataStore.Item> items, boolean empty) { Spinner sp = new Spinner(this); setSpinnerItems(sp, items, empty); return sp; }
    private void setSpinnerItems(Spinner sp, List<DataStore.Item> items, boolean empty) { sp.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, items)); }
    private long selectedId(Spinner sp){ Object o = sp.getSelectedItem(); return o instanceof DataStore.Item ? ((DataStore.Item)o).id : 0; }
    private void setCategory(Spinner sp, String[] arr){ sp.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, arr)); }
    private String labelForType(String code){ for (int i=0;i<typeCodes.length;i++) if (typeCodes[i].equals(code)) return typeLabels[i]; return code; }
    private void setVisible(View label, View field, boolean visible){ label.setVisibility(visible ? View.VISIBLE : View.GONE); field.setVisibility(visible ? View.VISIBLE : View.GONE); }
    private boolean notEmpty(String s){ return s != null && !s.trim().isEmpty(); }
    private String join(List<String> parts, String sep){ StringBuilder b = new StringBuilder(); for (String p: parts){ if (b.length()>0) b.append(sep); b.append(p); } return b.toString(); }
    private void toast(String s){ Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }
    private double parseOptional(EditText e){ try { String s=e.getText().toString().trim(); if (s.isEmpty()) return 0; return Double.parseDouble(s.replace(',', '.')); } catch(Exception ex){ return 0; } }
    private double parseRequired(EditText e, String error){ try { double v = Double.parseDouble(e.getText().toString().trim().replace(',', '.')); if (v < 0) throw new Exception(); return v; } catch(Exception ex){ toast(error); return -1; } }

    private void showAgreement(boolean informational) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("Пользовательское соглашение");
        b.setMessage("Приложение «Личный финансовый аудитор» предназначено для личного учёта и ориентировочного планирования финансов. Оно не является банковской, инвестиционной, налоговой или юридической консультацией. Все данные хранятся локально на устройстве. Пользователь самостоятельно отвечает за корректность вводимых данных, резервные копии и финансовые решения. Рекомендации приложения носят информационный и поддерживающий характер, не запрещают операции и не гарантируют финансовый результат. Продолжая пользоваться приложением, вы соглашаетесь с этими условиями.");
        if (!informational) b.setPositiveButton("Принимаю", (dialog, which) -> { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_AGREED, true).apply(); showInitialSetup(); });
        else b.setPositiveButton("Понятно", null);
        b.setCancelable(informational); b.show();
    }

    private void exportCsv() {
        try {
            File f = new File(getExternalFilesDir(null), "finance-auditor-operations.csv"); FileWriter w = new FileWriter(f);
            w.write("date,type,amount,source,target_wallet,fund,credit,category,comment\n");
            for (DataStore.OperationView op : store.allOperationsForExport()) {
                w.write(csv(op.date) + "," + csv(op.type) + "," + op.amount + "," + csv(op.account) + "," + csv(op.targetAccount) + "," + csv(op.fund) + "," + csv(op.creditName) + "," + csv(op.category) + "," + csv(op.comment) + "\n");
            }
            w.close(); toast("CSV сохранён: " + f.getAbsolutePath());
        } catch (Exception e) { toast("Не удалось экспортировать CSV: " + e.getMessage()); }
    }
    private String csv(String s){ String v = s == null ? "" : s.replace("\r", " ").replace("\n", " ").replace("\"", "\"\""); return "\"" + v + "\""; }
}
