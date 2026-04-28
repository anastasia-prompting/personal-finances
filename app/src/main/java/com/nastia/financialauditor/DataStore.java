package com.nastia.financialauditor;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DataStore extends SQLiteOpenHelper {
    private static final String DB_NAME = "finance_auditor.db";
    /** Версия схемы БД (используется и в SharedPreferences первичной настройки). */
    public static final int DB_VERSION = 2;

    public static final String TYPE_DEBIT = "debit_card";
    public static final String TYPE_CREDIT = "credit_card";
    public static final String TYPE_CASH = "cash";
    public static final String TYPE_MARKETPLACE = "marketplace_wallet";

    public static final String OP_INCOME = "income";
    public static final String OP_EXPENSE = "expense";
    public static final String OP_TRANSFER_TO_FUND = "transfer_to_fund";
    public static final String OP_EXPENSE_FROM_FUND = "expense_from_fund";
    public static final String OP_CREDIT_PAYMENT = "credit_payment";
    public static final String OP_DEBT_INCREASE = "debt_increase";
    public static final String OP_MARKETPLACE_TRANSFER = "marketplace_transfer";

    public DataStore(Context context) { super(context, DB_NAME, null, DB_VERSION); }

    @Override public void onCreate(SQLiteDatabase db) { createTables(db); seed(db); }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS operations");
        db.execSQL("DROP TABLE IF EXISTS credits");
        db.execSQL("DROP TABLE IF EXISTS funds");
        db.execSQL("DROP TABLE IF EXISTS accounts");
        onCreate(db);
    }

    private void createTables(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE accounts(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,type TEXT NOT NULL,currency TEXT NOT NULL,initial_balance REAL NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,credit_limit REAL NOT NULL DEFAULT 0,current_debt REAL NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE funds(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,type TEXT NOT NULL,target_amount REAL NOT NULL DEFAULT 0,initial_balance REAL NOT NULL DEFAULT 0,planned_percent REAL NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,operational INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE credits(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,current_debt REAL NOT NULL DEFAULT 0,interest_rate REAL NOT NULL DEFAULT 0,min_payment REAL NOT NULL DEFAULT 0,comfortable_payment REAL NOT NULL DEFAULT 0,linked_account_id INTEGER)");
        db.execSQL("CREATE TABLE operations(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT NOT NULL,type TEXT NOT NULL,amount REAL NOT NULL,currency TEXT NOT NULL DEFAULT 'RUB',account_id INTEGER,target_account_id INTEGER,fund_id INTEGER,credit_id INTEGER,category TEXT,comment TEXT,created_at TEXT NOT NULL)");
    }

    private void seed(SQLiteDatabase db) {
        addAccount(db, "Карта1", TYPE_DEBIT, "RUB", 0, true, 0, 0);
        addAccount(db, "Карта2", TYPE_DEBIT, "RUB", 0, false, 0, 0);
        addAccount(db, "Карта3", TYPE_DEBIT, "RUB", 0, false, 0, 0);
        addAccount(db, "Карта4", TYPE_DEBIT, "RUB", 0, false, 0, 0);
        addAccount(db, "Карта5", TYPE_DEBIT, "RUB", 0, false, 0, 0);
        addAccount(db, "Наличные", TYPE_CASH, "RUB", 0, true, 0, 0);
        addAccount(db, "Ozon-кошелёк", TYPE_MARKETPLACE, "RUB", 0, false, 0, 0);
        addAccount(db, "WB-кошелёк", TYPE_MARKETPLACE, "RUB", 0, false, 0, 0);

        addFund(db, "Продукты и Быт", "operational", 0, 0, 41, true, true);
        addFund(db, "Съём и Маневренный фонд", "goal", 200000, 0, 35, true, false);
        addFund(db, "Подушка Безопасности", "goal", 1250000, 0, 5, true, false);
        addFund(db, "Фонд Финансовой цели года", "goal", 500000, 0, 5, true, false);
        addFund(db, "Фонд Удовольствий", "regular", 0, 0, 4, true, false);
        addFund(db, "Фонд Больших Покупок", "regular", 0, 0, 4, true, false);
        addFund(db, "Фонд Собственного Жилья", "goal", 10000000, 0, 3, true, false);
        addFund(db, "Фонд Инвестиций", "regular", 0, 0, 3, true, false);
        addFund(db, "Фонд9", "regular", 0, 0, 0, false, false);
        addFund(db, "Фонд10", "regular", 0, 0, 0, false, false);
    }

    private long addAccount(SQLiteDatabase db, String name, String type, String currency, double balance, boolean active, double limit, double debt) {
        ContentValues cv = new ContentValues();
        cv.put("name", name); cv.put("type", type); cv.put("currency", currency); cv.put("initial_balance", balance);
        cv.put("active", active ? 1 : 0); cv.put("credit_limit", limit); cv.put("current_debt", debt);
        long id = db.insert("accounts", null, cv);
        if (active && TYPE_CREDIT.equals(type)) addCreditForCard(db, id, name, debt);
        return id;
    }

    private long addFund(SQLiteDatabase db, String name, String type, double target, double balance, double percent, boolean active, boolean operational) {
        ContentValues cv = new ContentValues();
        cv.put("name", name); cv.put("type", type); cv.put("target_amount", target); cv.put("initial_balance", balance);
        cv.put("planned_percent", percent); cv.put("active", active ? 1 : 0); cv.put("operational", operational ? 1 : 0);
        return db.insert("funds", null, cv);
    }

    private long addCreditForCard(SQLiteDatabase db, long accountId, String cardName, double debt) {
        ContentValues credit = new ContentValues();
        credit.put("name", "Кредитка: " + cardName); credit.put("current_debt", debt); credit.put("interest_rate", 0); credit.put("min_payment", 0); credit.put("comfortable_payment", 0); credit.put("linked_account_id", accountId);
        return db.insert("credits", null, credit);
    }

    public void saveInitialSetup(List<AccountConfig> accounts, List<FundConfig> funds) {
        SQLiteDatabase db = getWritableDatabase(); db.beginTransaction();
        try {
            db.delete("operations", null, null); db.delete("credits", null, null); db.delete("funds", null, null); db.delete("accounts", null, null);
            for (AccountConfig a : accounts) addAccount(db, a.name, a.type, a.currency, a.balance, a.active, a.creditLimit, a.currentDebt);
            for (FundConfig f : funds) addFund(db, f.name, f.type, f.targetAmount, f.initialBalance, f.plannedPercent, f.active, f.operational);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }

    public List<Item> getActiveIncomeDestinations() { return getAccountItems("WHERE active=1 AND type IN ('"+TYPE_DEBIT+"','"+TYPE_CASH+"','"+TYPE_MARKETPLACE+"') ORDER BY id", true); }
    public List<Item> getActiveExpenseSources() { return getAccountItems("WHERE active=1 AND type IN ('"+TYPE_DEBIT+"','"+TYPE_CASH+"','"+TYPE_MARKETPLACE+"') ORDER BY id", true); }
    public List<Item> getActiveFundTransferSources() { return getAccountItems("WHERE active=1 AND type IN ('"+TYPE_DEBIT+"','"+TYPE_CASH+"') ORDER BY id", true); }
    public List<Item> getActiveMarketplaceTransferSources() { return getAccountItems("WHERE active=1 AND type IN ('"+TYPE_DEBIT+"','"+TYPE_CREDIT+"') ORDER BY id", true); }
    public List<Item> getActiveMarketplaceWallets() { return getAccountItems("WHERE active=1 AND type='"+TYPE_MARKETPLACE+"' ORDER BY id", true); }
    public List<Item> getOperationFunds() { return getFundItems("WHERE active=1 AND operational=0 ORDER BY id", true); }
    public List<Item> getCredits() { return getCreditItems("ORDER BY id", true); }

    private List<Item> getAccountItems(String suffix, boolean withEmpty) {
        SQLiteDatabase db = getReadableDatabase(); List<Item> list = new ArrayList<>();
        if (withEmpty) list.add(new Item(0, "—", "", 0, 0, 0, true, 0, false));
        Cursor c = db.rawQuery("SELECT id,name,type,initial_balance,credit_limit,active,current_debt FROM accounts " + suffix, null);
        try { while (c.moveToNext()) list.add(new Item(c.getLong(0), c.getString(1), c.getString(2), c.getDouble(3), c.getDouble(4), 0, c.getInt(5)==1, c.getDouble(6), false)); } finally { c.close(); }
        return list;
    }
    private List<Item> getFundItems(String suffix, boolean withEmpty) {
        SQLiteDatabase db = getReadableDatabase(); List<Item> list = new ArrayList<>();
        if (withEmpty) list.add(new Item(0, "—", "", 0, 0, 0, true, 0, false));
        Cursor c = db.rawQuery("SELECT id,name,type,initial_balance,planned_percent,active,target_amount,operational FROM funds " + suffix, null);
        try { while (c.moveToNext()) list.add(new Item(c.getLong(0), c.getString(1), c.getString(2), c.getDouble(3), 0, c.getDouble(4), c.getInt(5)==1, c.getDouble(6), c.getInt(7)==1)); } finally { c.close(); }
        return list;
    }
    private List<Item> getCreditItems(String suffix, boolean withEmpty) {
        SQLiteDatabase db = getReadableDatabase(); List<Item> list = new ArrayList<>();
        if (withEmpty) list.add(new Item(0, "—", "", 0, 0, 0, true, 0, false));
        Cursor c = db.rawQuery("SELECT id,name,current_debt FROM credits " + suffix, null);
        try { while (c.moveToNext()) list.add(new Item(c.getLong(0), c.getString(1), "credit", c.getDouble(2), 0, 0, true, 0, false)); } finally { c.close(); }
        return list;
    }

    public String accountType(long accountId) { Cursor c = getReadableDatabase().rawQuery("SELECT type FROM accounts WHERE id=?", new String[]{String.valueOf(accountId)}); try { return c.moveToFirst() ? c.getString(0) : ""; } finally { c.close(); } }
    public long creditIdForAccount(long accountId) { Cursor c = getReadableDatabase().rawQuery("SELECT id FROM credits WHERE linked_account_id=? LIMIT 1", new String[]{String.valueOf(accountId)}); try { return c.moveToFirst() ? c.getLong(0) : 0; } finally { c.close(); } }

    public long addOperation(String type, double amount, long accountId, long targetAccountId, long fundId, long creditId, String category, String comment) {
        SQLiteDatabase db = getWritableDatabase(); ContentValues cv = new ContentValues();
        String now = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(new Date());
        cv.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date()));
        cv.put("type", type); cv.put("amount", amount); cv.put("currency", "RUB");
        if (accountId > 0) cv.put("account_id", accountId); if (targetAccountId > 0) cv.put("target_account_id", targetAccountId); if (fundId > 0) cv.put("fund_id", fundId); if (creditId > 0) cv.put("credit_id", creditId);
        cv.put("category", category == null ? "" : category); cv.put("comment", comment == null ? "" : comment); cv.put("created_at", now);
        return db.insert("operations", null, cv);
    }
    public void deleteOperation(long id) { getWritableDatabase().delete("operations", "id=?", new String[]{String.valueOf(id)}); }

    public Summary getSummary() {
        SQLiteDatabase db = getReadableDatabase(); Summary s = new Summary();
        // «Месяц» на главном экране: только доходы/расходы типов income и expense за текущий
        // календарный месяц. Колонка date — yyyy-MM-dd; шаблон LIKE «yyyy-MM%» совпадает с локальным месяцем.
        String monthLike = new SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(new Date()) + "%";
        s.totalIncome = scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='"+OP_INCOME+"' AND date LIKE '" + monthLike + "'");
        s.totalExpense = scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='"+OP_EXPENSE+"' AND date LIKE '" + monthLike + "'");
        s.cardBalance = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE active=1 AND type='"+TYPE_DEBIT+"'") + scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type='"+OP_INCOME+"' AND a.type='"+TYPE_DEBIT+"'") - scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type IN ('"+OP_EXPENSE+"','"+OP_TRANSFER_TO_FUND+"','"+OP_CREDIT_PAYMENT+"','"+OP_MARKETPLACE_TRANSFER+"') AND a.type='"+TYPE_DEBIT+"'");
        s.cashBalance = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE active=1 AND type='"+TYPE_CASH+"'") + scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type='"+OP_INCOME+"' AND a.type='"+TYPE_CASH+"'") - scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type IN ('"+OP_EXPENSE+"','"+OP_TRANSFER_TO_FUND+"','"+OP_CREDIT_PAYMENT+"') AND a.type='"+TYPE_CASH+"'");
        s.marketplaceBalance = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE active=1 AND type='"+TYPE_MARKETPLACE+"'") + scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type='"+OP_INCOME+"' AND a.type='"+TYPE_MARKETPLACE+"'") + scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.target_account_id=a.id WHERE o.type='"+OP_MARKETPLACE_TRANSFER+"' AND a.type='"+TYPE_MARKETPLACE+"'") - scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type='"+OP_EXPENSE+"' AND a.type='"+TYPE_MARKETPLACE+"'");
        s.fundsTotal = scalar(db, "SELECT COALESCE(SUM(initial_balance),0) FROM funds WHERE active=1 AND operational=0") + scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN funds f ON o.fund_id=f.id WHERE o.type IN ('"+OP_TRANSFER_TO_FUND+"','"+OP_INCOME+"') AND f.operational=0") - scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN funds f ON o.fund_id=f.id WHERE o.type='"+OP_EXPENSE_FROM_FUND+"' AND f.operational=0");
        s.debt = scalar(db, "SELECT COALESCE(SUM(current_debt),0) FROM credits") + scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='"+OP_DEBT_INCREASE+"'") + scalar(db, "SELECT COALESCE(SUM(o.amount),0) FROM operations o JOIN accounts a ON o.account_id=a.id WHERE o.type='"+OP_MARKETPLACE_TRANSFER+"' AND a.type='"+TYPE_CREDIT+"'") - scalar(db, "SELECT COALESCE(SUM(amount),0) FROM operations WHERE type='"+OP_CREDIT_PAYMENT+"'");
        return s;
    }

    private static final String OPERATIONS_WITH_RELATIONS = "SELECT o.id,o.date,o.type,o.amount,COALESCE(a.name,''),COALESCE(ta.name,''),COALESCE(f.name,''),COALESCE(o.category,''),COALESCE(o.comment,''),COALESCE(cr.name,'') FROM operations o LEFT JOIN accounts a ON o.account_id=a.id LEFT JOIN accounts ta ON o.target_account_id=ta.id LEFT JOIN funds f ON o.fund_id=f.id LEFT JOIN credits cr ON o.credit_id=cr.id ";
    public List<OperationView> recentOperations() { return queryOperations(OPERATIONS_WITH_RELATIONS + "ORDER BY o.id DESC LIMIT 20"); }
    public List<OperationView> allOperationsForExport() { return queryOperations(OPERATIONS_WITH_RELATIONS + "ORDER BY o.id ASC"); }
    private List<OperationView> queryOperations(String sql) { SQLiteDatabase db = getReadableDatabase(); List<OperationView> list = new ArrayList<>(); Cursor c = db.rawQuery(sql, null); try { while (c.moveToNext()) { OperationView v = new OperationView(); v.id=c.getLong(0); v.date=c.getString(1); v.type=c.getString(2); v.amount=c.getDouble(3); v.account=c.getString(4); v.targetAccount=c.getString(5); v.fund=c.getString(6); v.category=c.getString(7); v.comment=c.getString(8); v.creditName=c.getString(9); list.add(v); } } finally { c.close(); } return list; }
    private double scalar(SQLiteDatabase db, String sql) { Cursor c = db.rawQuery(sql, null); try { return c.moveToFirst() ? c.getDouble(0) : 0; } finally { c.close(); } }

    public static class AccountConfig { public String name, type, currency; public double balance, creditLimit, currentDebt; public boolean active; }
    public static class FundConfig { public String name, type; public double targetAmount, initialBalance, plannedPercent; public boolean active, operational; }
    public static class Item { public long id; public String name, type; public double balance, creditLimit, percent, targetAmount; public boolean active, operational; Item(long id, String name, String type, double balance, double creditLimit, double percent, boolean active, double targetAmount, boolean operational){ this.id=id; this.name=name; this.type=type; this.balance=balance; this.creditLimit=creditLimit; this.percent=percent; this.active=active; this.targetAmount=targetAmount; this.operational=operational; } @Override public String toString(){return name;} }
    public static class Summary { public double totalIncome, totalExpense, cardBalance, cashBalance, marketplaceBalance, fundsTotal, debt; }
    public static class OperationView { public long id; public String date, type, account, targetAccount, fund, creditName, category, comment; public double amount; }
}
