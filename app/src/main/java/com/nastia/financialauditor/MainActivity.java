package com.nastia.financialauditor;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;
import java.io.*;
import java.text.DecimalFormat;
import java.util.*;

public class MainActivity extends Activity {
    private static final String PREFS = "auditor_prefs";
    private static final String KEY_AGREED = "user_agreed";
    private static final String KEY_DARK = "dark_theme";
    private DataStore store;
    private LinearLayout content;
    private final DecimalFormat money = new DecimalFormat("#,##0.## ₽");
    private boolean dark;

    private final String[] typeLabels = {"Доход", "Расход", "Перевод в фонд", "Расход из фонда", "Платёж по кредиту", "Увеличение долга"};
    private final String[] typeCodes = {"income", "expense", "transfer_to_fund", "expense_from_fund", "credit_payment", "debt_increase"};
    private final String[] expenseCategories = {"ЖКХ, налоги, телефоны, интернет", "Дети", "Продукты, еда вне дома", "Бытовая химия, товары для дома", "Красота, здоровье", "Одежда, обувь, аксессуары", "Разное и форс-мажор", "Транспорт, авто", "Подарки и благотворительность", "Хочушки-удовольствия"};
    private final String[] incomeCategories = {"Зарплата", "Аренда", "Алименты", "Пособия", "Фриланс", "Продажа вещей", "Подарок", "Проценты и доход на остаток", "Кэшбэк / бонусы"};
    private final String[] creditCategories = {"Платёж по кредиту", "Увеличение долга", "Страховка кредитора", "Покупка в кредит", "Комиссия / проценты"};

    @Override protected void onCreate(Bundle b) {
        dark = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_DARK, false);
        setTheme(dark ? R.style.AppTheme_Dark : R.style.AppTheme_Light);
        super.onCreate(b);
        store = new DataStore(this);
        buildUi();
        if (!getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_AGREED, false)) showAgreement(false);
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(26, 28, 26, 40);
        content.setBackgroundColor(dark ? Color.rgb(25,23,23) : Color.rgb(245,241,234));
        scroll.addView(content);
        setContentView(scroll);
        renderHome();
    }

    private TextView tv(String text, int sp, int style) {
        TextView v = new TextView(this); v.setText(text); v.setTextSize(sp); v.setTypeface(null, style); v.setTextColor(dark ? Color.rgb(245,241,234) : Color.rgb(45,42,42)); v.setPadding(0, 8, 0, 8); return v;
    }
    private Button btn(String text) { Button b = new Button(this); b.setText(text); b.setAllCaps(false); return b; }

    private void renderHome() {
        content.removeAllViews();
        LinearLayout top = new LinearLayout(this); top.setOrientation(LinearLayout.HORIZONTAL); top.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = tv("Личный финансовый аудитор", 24, 1); top.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        Button theme = btn(dark ? "Светлая" : "Тёмная"); theme.setOnClickListener(v -> { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_DARK, !dark).apply(); recreate(); }); top.addView(theme);
        content.addView(top);
        content.addView(tv("Ясность без давления. Управление без жёсткости.", 14, 0));

        DataStore.Summary s = store.getSummary();
        addCard("Текущее состояние", "Карты: " + money.format(s.accountBalance) + "\nНаличные: " + money.format(s.cashBalance) + "\nФонды: " + money.format(s.fundsTotal) + "\nДолг: " + money.format(s.debt));
        addCard("Месяц", "Доходы: " + money.format(s.totalIncome) + "\nРасходы: " + money.format(s.totalExpense) + "\nЧисто: " + money.format(s.totalIncome - s.totalExpense));
        addRecommendation(s);

        Button add = btn("+ Добавить операцию"); add.setOnClickListener(v -> showOperationDialog()); content.addView(add);
        Button export = btn("Экспорт CSV"); export.setOnClickListener(v -> exportCsv()); content.addView(export);
        Button agreement = btn("Пользовательское соглашение"); agreement.setOnClickListener(v -> showAgreement(true)); content.addView(agreement);
        content.addView(tv("Последние операции", 20, 1));
        for (DataStore.OperationView op : store.recentOperations()) addOperationRow(op);
    }

    private void addCard(String title, String body) {
        TextView box = tv(title + "\n" + body, 16, 0);
        box.setBackgroundColor(dark ? Color.rgb(49,67,85) : Color.rgb(216,206,194));
        box.setPadding(24, 20, 24, 20); LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0,12,0,12); content.addView(box, lp);
    }

    private void addRecommendation(DataStore.Summary s) {
        String text;
        if (s.debt > 0 && s.totalIncome > 0) text = "Подсказка: долг виден в системе. Можно выбрать комфортный платёж выше минимального и двигаться без рывков.";
        else if (s.totalIncome > 0 && s.fundsTotal == 0) text = "Подсказка: после дохода можно направить небольшую долю в фонды. Даже 5% уже создают опору.";
        else text = "Подсказка: система работает мягко — она предупреждает и помогает видеть картину, но не запрещает решения.";
        addCard("Мягкая рекомендация", text);
    }

    private void addOperationRow(DataStore.OperationView op) {
        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.VERTICAL); row.setPadding(18,16,18,16); row.setBackgroundColor(dark ? Color.rgb(45,42,42) : Color.WHITE);
        TextView t = tv(labelForType(op.type) + " • " + money.format(op.amount), 16, 1); row.addView(t);
        row.addView(tv(op.date + " • " + safe(op.account) + " " + safe(op.fund) + " " + safe(op.category) + "\n" + safe(op.comment), 13, 0));
        Button del = btn("Удалить"); del.setOnClickListener(v -> { store.deleteOperation(op.id); renderHome(); }); row.addView(del);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0,8,0,8); content.addView(row, lp);
    }
    private String safe(String s){ return s == null ? "" : s; }

    private void showOperationDialog() {
        Dialog d = new Dialog(this); d.setTitle("Новая операция");
        ScrollView sv = new ScrollView(this); LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(26, 22, 26, 22); sv.addView(box);
        Spinner type = spinner(typeLabels); EditText amount = input("Сумма"); amount.setInputType(8194);
        Spinner account = spinnerItems(store.getAccounts(), true); Spinner fund = spinnerItems(store.getFunds(), true); Spinner credit = spinnerItems(store.getCredits(), true);
        Spinner category = spinner(expenseCategories); EditText comment = input("Комментарий");
        box.addView(label("Тип операции")); box.addView(type); box.addView(label("Сумма")); box.addView(amount);
        box.addView(label("Счёт")); box.addView(account); box.addView(label("Фонд")); box.addView(fund); box.addView(label("Кредит")); box.addView(credit); box.addView(label("Категория")); box.addView(category); box.addView(label("Комментарий")); box.addView(comment);
        Button save = btn("Сохранить"); box.addView(save); Button saveMore = btn("Сохранить и добавить ещё"); box.addView(saveMore);
        type.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){ public void onItemSelected(android.widget.AdapterView<?> p, View v, int pos, long id){ updateCategory(category, typeCodes[pos]); } public void onNothingSelected(android.widget.AdapterView<?> p){} });
        View.OnClickListener saver = v -> {
            double a; try { a = Double.parseDouble(amount.getText().toString().replace(',', '.')); if (a <= 0) throw new Exception(); } catch(Exception e){ toast("Введите положительную сумму"); return; }
            String code = typeCodes[type.getSelectedItemPosition()];
            long accId = selectedId(account), fundId = selectedId(fund), creditId = selectedId(credit);
            if ((code.equals("expense") || code.equals("income") || code.equals("transfer_to_fund") || code.equals("credit_payment")) && accId <= 0) { toast("Выберите счёт"); return; }
            if ((code.equals("transfer_to_fund") || code.equals("expense_from_fund")) && fundId <= 0) { toast("Выберите фонд"); return; }
            if ((code.equals("credit_payment") || code.equals("debt_increase")) && creditId <= 0) { toast("Выберите кредит"); return; }
            store.addOperation(code, a, accId, fundId, creditId, (String)category.getSelectedItem(), comment.getText().toString());
            toast("Операция сохранена"); amount.setText(""); comment.setText(""); renderHome(); if (v == save) d.dismiss(); else amount.requestFocus();
        };
        save.setOnClickListener(saver); saveMore.setOnClickListener(saver);
        d.setContentView(sv); d.show();
    }

    private TextView label(String s){ return tv(s, 13, 1); }
    private EditText input(String hint){ EditText e = new EditText(this); e.setHint(hint); e.setSingleLine(false); e.setTextColor(dark ? Color.WHITE : Color.BLACK); e.setHintTextColor(dark ? Color.LTGRAY : Color.DKGRAY); return e; }
    private Spinner spinner(String[] values){ Spinner sp = new Spinner(this); sp.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, values)); return sp; }
    private Spinner spinnerItems(List<DataStore.Item> items, boolean empty) { List<DataStore.Item> list = new ArrayList<>(); if (empty) list.add(new DataStore.Item(0, "—")); list.addAll(items); Spinner sp = new Spinner(this); sp.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, list)); return sp; }
    private long selectedId(Spinner sp){ Object o = sp.getSelectedItem(); return o instanceof DataStore.Item ? ((DataStore.Item)o).id : 0; }
    private void updateCategory(Spinner sp, String type){ String[] arr = type.equals("income") ? incomeCategories : (type.equals("credit_payment") || type.equals("debt_increase") ? creditCategories : expenseCategories); sp.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, arr)); }
    private String labelForType(String code){ for (int i=0;i<typeCodes.length;i++) if (typeCodes[i].equals(code)) return typeLabels[i]; return code; }
    private void toast(String s){ Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }

    private void showAgreement(boolean informational) {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("Пользовательское соглашение");
        b.setMessage("Приложение «Личный финансовый аудитор» предназначено для личного учёта и ориентировочного планирования финансов. Оно не является банковской, инвестиционной, налоговой или юридической консультацией. Все данные хранятся локально на устройстве. Пользователь самостоятельно отвечает за корректность вводимых данных, резервные копии и финансовые решения. Рекомендации приложения носят информационный и поддерживающий характер, не запрещают операции и не гарантируют финансовый результат. Продолжая пользоваться приложением, вы соглашаетесь с этими условиями.");
        if (!informational) b.setPositiveButton("Принимаю", (dialog, which) -> getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_AGREED, true).apply());
        else b.setPositiveButton("Понятно", null);
        b.setCancelable(informational); b.show();
    }

    private void exportCsv() {
        try {
            File f = new File(getExternalFilesDir(null), "finance-auditor-operations.csv");
            FileWriter w = new FileWriter(f); w.write("date,type,amount,account,fund,category,comment\n");
            for (DataStore.OperationView op: store.recentOperations()) w.write(op.date + "," + op.type + "," + op.amount + ",\"" + op.account + "\",\"" + op.fund + "\",\"" + op.category + "\",\"" + op.comment + "\"\n");
            w.close(); toast("CSV сохранён: " + f.getAbsolutePath());
        } catch (Exception e) { toast("Не удалось экспортировать CSV: " + e.getMessage()); }
    }
}
