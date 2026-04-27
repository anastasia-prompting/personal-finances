package com.nastia.financialauditor;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.content.ContentValues;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DataStore extends SQLiteOpenHelper {
    private static final String DB_NAME = "finance_auditor.db";
    private static final int DB_VERSION = 1;

    public DataStore(Context context) { super(context, DB_NAME, null, DB_VERSION); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE accounts(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, currency TEXT NOT NULL, initial_balance REAL NOT NULL DEFAULT 0, is_credit INTEGER NOT NULL DEFAULT 0, credit_limit REAL NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE funds(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, target_amount REAL NOT NULL DEFAULT 0, initial_balance REAL NOT NULL DEFAULT 0, planned_percent REAL NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE credits(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, current_debt REAL NOT NULL DEFAULT 0, interest_rate REAL NOT NULL DEFAULT 0, min_payment REAL NOT NULL DEFAULT 0, comfortable_payment REAL NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE operations(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'RUB', account_id INTEGER, fund_id INTEGER, credit_id INTEGER, category TEXT, comment TEXT, created_at TEXT NOT NULL)");
        seed(db);
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { }

    private void seed(SQLiteDatabase db) {
        addAccount(db, "Основная карта", "debit_card", "RUB", 0, false, 0);
        addAccount(db, "Наличные", "cash", "RUB", 0, false, 0);
        addAccount(db, "Кредитная карта", "credit_card", "RUB", 0, true, 100000);
        addFund(db, "Подушка безопасности", "regular", 0, 0, 15);
        addFund(db, "Арендное жильё и маневренный фонд", "goal", 0, 0, 20);
        addFund(db, "Фонд развития", "regular", 0, 0, 10);
        addFund(db, "Фонд удовольствий", "regular", 0, 0, 5);
        addFund(db, "Ozon", "marketplace_wallet", 0, 0, 0);
        addFund(db, "Wildberries", "marketplace_wallet", 0, 0, 0);
        ContentValues credit = new ContentValues();
        credit.put("name", "Кредит / кредитка"); credit.put("current_debt", 0); credit.put("interest_rate", 0); credit.put("min_payment", 0); credit.put("comfortable_payment", 0);
        db.insert("credits", null, credit);
    }

    private long addAccount(SQLiteDatabase db, String name, String type, String currency, double balance, boolean isCredit, double limit) {
        ContentValues cv = new ContentValues(); cv.put("name", name); cv.put("type", type); cv.put("currency", currency); cv.put("initial_balance", balance); cv.put("is_credit", isCredit ? 1 : 0); cv.put("credit_limit", limit); return db.insert("accounts", null, cv);
    }
    private long addFund(SQLiteDatabase db, String name, String type, double target, double balance, double percent) {
        ContentValues cv = new ContentValues(); cv.put("name", name); cv.put("type", type); cv.put("target_amount", target); cv.put("initial_balance", balance); cv.put("planned_percent", percent); return db.insert("funds", null, cv);
    }

    public List<Item> getAccounts() { return getItems("accounts"); }
    public List<Item> getFunds() { return getItems("funds"); }
    public List<Item> getCredits() { return getItems("credits"); }
    private List<Item> getItems(String table) {
        SQLiteDatabase db = getReadableDatabase(); List<Item> list = new ArrayList<>();
        Cursor c = db.rawQuery("SELECT id, name FROM " + table + " ORDER BY id", null);
        try { while (c.moveToNext()) list.add(new Item(c.getLong(0), c.getString(1))); } finally { c.close(); }
        return list;
    }

    public long addOperation(String type, double amount, long accountId, long fundId, long creditId, String category, String comment) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        String now = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(new Date());
        cv.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date()));
        cv.put("type", type); cv.put("amount", amount); cv.put("currency", "RUB");
        if (accountId > 0) cv.put("account_id", accountId); if (fundId > 0) cv.put("fund_id", fundId); if (creditId > 0) cv.put("credit_id", creditId);
        cv.put("category", category == null ? "" : category); cv.put("comment", comment == null ? "" : comment); cv.put("created_at", now);
        return db.insert("operations", null, cv);
    }

    public void deleteOperation(long id) { getWritableDatabase().delete("operations", "id=?", new String[]{String.valueOf(id)}); }

    public Summary getSummary() {
        SQLiteDatabase db = getReadableDatabase(); Summary s = new Summary();
        s.totalIncome = scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='income'");
        s.totalExpense = scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='expense'");
        s.fundsTotal = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM funds") + scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type IN ('transfer_to_fund','income') AND fund_id IS NOT NULL") - scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='expense_from_fund'");
        s.debt = scalar(db, "SELECT COALESCE(SUM(current_debt),0) FROM credits") + scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='debt_increase'") - scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='credit_payment'");
        s.accountBalance = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE type!='cash'") + scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='income' AND account_id IS NOT NULL") - scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type IN ('expense','transfer_to_fund','credit_payment') AND account_id IS NOT NULL");
        s.cashBalance = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE type='cash'") + scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='income' AND account_id IN (SELECT id FROM accounts WHERE type='cash')") - scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type IN ('expense','transfer_to_fund','credit_payment') AND account_id IN (SELECT id FROM accounts WHERE type='cash')");
        return s;
    }

    /**
     * Одна выборка для экрана и для экспорта: счёт/фонд — это денежные корзины и цели;
     * обязательство по кредиту хранится отдельно (таблица {@code credits}), поэтому имя кредита
     * подтягивается своим JOIN — не смешиваем его с названием карты или фонда.
     */
    private static final String OPERATIONS_WITH_RELATIONS =
            "SELECT o.id,o.date,o.type,o.amount,"
                    + "COALESCE(a.name,''),COALESCE(f.name,''),COALESCE(o.category,''),COALESCE(o.comment,''),"
                    + "COALESCE(cr.name,'') "
                    + "FROM operations o "
                    + "LEFT JOIN accounts a ON o.account_id=a.id "
                    + "LEFT JOIN funds f ON o.fund_id=f.id "
                    + "LEFT JOIN credits cr ON o.credit_id=cr.id ";

    /**
     * Главный экран — только «быстрый хвост»: последние 20 операций, чтобы не перегружать скролл.
     * Сводки по деньгам по-прежнему считает {@link #getSummary()} — здесь его не трогаем в этой итерации.
     */
    public List<OperationView> recentOperations() {
        return queryOperations(OPERATIONS_WITH_RELATIONS + "ORDER BY o.id DESC LIMIT 20");
    }

    /**
     * Экспорт CSV — полный архив операций для бэкапа или разбора в таблице; ограничение «20» тут
     * неприменимо, иначе файл не отражал бы историю целиком.
     */
    public List<OperationView> allOperationsForExport() {
        return queryOperations(OPERATIONS_WITH_RELATIONS + "ORDER BY o.id ASC");
    }

    private List<OperationView> queryOperations(String sql) {
        SQLiteDatabase db = getReadableDatabase();
        List<OperationView> list = new ArrayList<>();
        Cursor c = db.rawQuery(sql, null);
        try {
            while (c.moveToNext()) {
                OperationView v = new OperationView();
                v.id = c.getLong(0);
                v.date = c.getString(1);
                v.type = c.getString(2);
                v.amount = c.getDouble(3);
                v.account = c.getString(4);
                v.fund = c.getString(5);
                v.category = c.getString(6);
                v.comment = c.getString(7);
                v.creditName = c.getString(8);
                list.add(v);
            }
        } finally {
            c.close();
        }
        return list;
    }

    private double scalar(SQLiteDatabase db, String sql) { Cursor c = db.rawQuery(sql, null); try { return c.moveToFirst() ? c.getDouble(0) : 0; } finally { c.close(); } }

    public static class Item { public long id; public String name; Item(long id, String name){this.id=id;this.name=name;} @Override public String toString(){return name;} }
    public static class Summary { public double totalIncome, totalExpense, fundsTotal, debt, accountBalance, cashBalance; }
    public static class OperationView {
        public long id;
        public String date, type, account, fund, creditName, category, comment;
        public double amount;
    }
}
