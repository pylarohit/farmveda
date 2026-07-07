"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserData } from "@/context/UserDataProvider";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Trash2, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sliders, 
  FileText, 
  RefreshCw, 
  Info,
  Calendar,
  AlertTriangle,
  Sparkles,
  Download,
  Database,
  Sprout,
  PiggyBank
} from "lucide-react";
import { toast } from "react-hot-toast";

// Simplified agricultural categories for farmers
const EXPENSE_CATEGORIES = [
  "Seeds & Planting",
  "Fertilizers & Pesticides",
  "Machinery & Rent",
  "Labor Wages",
  "Fuel & Transport",
  "Irrigation & Water",
  "Storage & Cold Room",
  "Loans & Interest",
  "Others"
];

const INCOME_CATEGORIES = [
  "Crop Sales",
  "Govt Subsidies",
  "Machinery renting income",
  "Livestock/Dairy Sales",
  "Others"
];

interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  farm_id: string; // references Supabase farm.id or "general"
  crop: string;    // Paddy, Cotton, etc.
  date: string;
  description: string;
  
  // Peer Debt/Loans Extension
  is_peer_debt?: boolean;
  peer_name?: string;
  due_date?: string;
  debt_status?: "pending" | "settled";
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val);
};

export default function BudgetPage() {
  const { user } = useUserData();
  const supabase = createClient();

  // Core Data States
  const [farms, setFarms] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [farmBudgets, setFarmBudgets] = useState<Record<string, number>>({}); // farm_id -> budget
  
  // App States
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all"); // "all" = overall, or farm_id

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBudgetPromptOpen, setIsBudgetPromptOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [tempBudgetInput, setTempBudgetInput] = useState("");

  // Add Transaction Form
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newFarmId, setNewFarmId] = useState("general");
  const [newCropOverride, setNewCropOverride] = useState("Paddy"); // Only used if farmId is "general"
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newDescription, setNewDescription] = useState("");

  // Peer Loan Form States
  const [isPeerDebt, setIsPeerDebt] = useState(false);
  const [peerName, setPeerName] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Graph hover segment
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Load user's registered farms
  const loadFarms = async () => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFarms(data || []);
      return data || [];
    } catch (e: any) {
      console.error("Error loading farms:", e);
      throw e;
    }
  };

  // Load budgets and transactions strictly from Supabase
  const loadBudgetsAndTransactions = async () => {
    if (!user) return;
    setLoading(true);
    setDbError(null);

    try {
      // 1. Fetch Farms first
      const activeFarms = await loadFarms();

      // 2. Fetch Transactions from Supabase
      const { data: txData, error: txError } = await supabase
        .from("budget_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      // 3. Fetch Budgets from Supabase
      const { data: budgetData, error: budgetError } = await supabase
        .from("farm_budgets")
        .select("*")
        .eq("user_id", user.id);

      if (txError) throw txError;
      if (budgetError) throw budgetError;

      const loadedBudgets: Record<string, number> = {};
      if (budgetData) {
        budgetData.forEach((b: any) => {
          loadedBudgets[b.farm_id] = Number(b.estimated_budget);
        });
      }

      setTransactions(txData || []);
      setFarmBudgets(loadedBudgets);
    } catch (e: any) {
      console.error("Real-time database sync failed:", e.message || e);
      setDbError(e.message || "Table relation not found. Check if SQL schema is installed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBudgetsAndTransactions();
    }
  }, [user]);

  // --- WRITE LOGIC ---

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    let resolvedCrop = "General";
    if (newFarmId !== "general") {
      const selectedFarm = farms.find((f) => f.id === newFarmId);
      if (selectedFarm && selectedFarm.intended_crop) {
        resolvedCrop = selectedFarm.intended_crop;
      }
    } else {
      resolvedCrop = newCropOverride;
    }

    const newTxPayload = {
      user_id: user?.id,
      amount: Number(newAmount),
      type: newType,
      category: isPeerDebt 
        ? (newType === "income" ? "Peer Loan (Borrowed)" : "Peer Loan (Lent)") 
        : newCategory,
      farm_id: newFarmId === "general" ? null : newFarmId,
      crop: resolvedCrop,
      date: newDate,
      description: newDescription || `${newType === "income" ? "Earnings" : "Expense"} for ${resolvedCrop}`,
      is_peer_debt: isPeerDebt,
      peer_name: isPeerDebt ? peerName : null,
      due_date: isPeerDebt ? (dueDate || null) : null,
      debt_status: isPeerDebt ? "pending" : null
    };

    try {
      const { error } = await supabase
        .from("budget_transactions")
        .insert([newTxPayload]);

      if (error) throw error;
      
      toast.success("Saved successfully!");
      loadBudgetsAndTransactions();

      // Reset Form & Close
      setNewAmount("");
      setNewDescription("");
      setIsAddOpen(false);
    } catch (err: any) {
      console.error("Failed to insert transaction:", err);
      toast.error("Failed to save entry.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        const { error } = await supabase
          .from("budget_transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", user?.id);

        if (error) throw error;
        toast.success("Entry deleted");
        loadBudgetsAndTransactions();
      } catch (err: any) {
        console.error("Deletion error:", err);
        toast.error("Failed to delete entry.");
      }
    }
  };

  const handleSettleDebt = async (id: string) => {
    try {
      const { error } = await supabase
        .from("budget_transactions")
        .update({ debt_status: "settled" })
        .eq("id", id)
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Marked as paid back!");
      loadBudgetsAndTransactions();
    } catch (err: any) {
      console.error("Error settling debt:", err);
      toast.error("Failed to update status.");
    }
  };

  const handleSetEstimatedBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFarmId === "all" || !user) return;
    if (!tempBudgetInput || isNaN(Number(tempBudgetInput)) || Number(tempBudgetInput) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const { error } = await supabase
        .from("farm_budgets")
        .upsert([{
          user_id: user.id,
          farm_id: selectedFarmId,
          estimated_budget: Number(tempBudgetInput)
        }], { onConflict: "user_id, farm_id" });

      if (error) throw error;

      toast.success("Spending limit saved!");
      loadBudgetsAndTransactions();
      setIsBudgetPromptOpen(false);
    } catch (err: any) {
      console.error("Budget save error:", err);
      toast.error("Failed to save limit.");
    }
  };

  // --- CALCULATION LOGIC ---

  const farmsMap = useMemo(() => {
    const map: Record<string, any> = {};
    farms.forEach((f) => {
      map[f.id] = f;
    });
    return map;
  }, [farms]);

  const getFarmDisplayName = (fid: string | null | undefined) => {
    if (!fid || fid === "general") return "General (Not linked to any field)";
    const f = farmsMap[fid];
    if (!f) return "Unknown Field";
    const name = f.field_name ? (f.field_name.includes("|||") ? f.field_name.split("|||")[0] : f.field_name) : "Unnamed Field";
    return name;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesFarm = selectedFarmId === "all" || tx.farm_id === selectedFarmId;
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getFarmDisplayName(tx.farm_id).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || tx.category === categoryFilter;

      return matchesFarm && matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, selectedFarmId, searchQuery, typeFilter, categoryFilter, farmsMap]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let cropIncome = 0;
    let cropExpense = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === "income") {
        income += tx.amount;
        if (!tx.is_peer_debt) cropIncome += tx.amount;
      } else {
        expense += tx.amount;
        if (!tx.is_peer_debt) cropExpense += tx.amount;
      }
    });

    let estimatedBudget = 0;
    if (selectedFarmId === "all") {
      estimatedBudget = Object.values(farmBudgets).reduce((sum, b) => sum + b, 0);
    } else {
      estimatedBudget = farmBudgets[selectedFarmId] || 0;
    }

    const netProfit = cropIncome - cropExpense;
    const remainingBudget = Math.max(0, estimatedBudget - cropExpense);
    const budgetUsagePercent = estimatedBudget > 0 ? (cropExpense / estimatedBudget) * 100 : 0;

    return { 
      income, 
      expense, 
      cropIncome,
      cropExpense,
      netProfit, 
      estimatedBudget,
      remainingBudget, 
      budgetUsagePercent 
    };
  }, [filteredTransactions, selectedFarmId, farmBudgets]);

  const isBudgetMissingForSelected = useMemo(() => {
    if (selectedFarmId === "all") return false;
    const budget = farmBudgets[selectedFarmId];
    return budget === undefined || budget === 0;
  }, [selectedFarmId, farmBudgets]);

  const categoryExpenses = useMemo(() => {
    const sums: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach(cat => sums[cat] = 0);
    
    filteredTransactions.forEach(tx => {
      if (tx.type === "expense") {
        if (sums[tx.category] !== undefined) {
          sums[tx.category] += tx.amount;
        } else {
          sums["Others"] = (sums["Others"] || 0) + tx.amount;
        }
      }
    });
    return sums;
  }, [filteredTransactions]);

  const donutData = useMemo(() => {
    const activeExpenses = Object.entries(categoryExpenses)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
    
    const total = activeExpenses.reduce((sum, item) => sum + item.value, 0);
    return { data: activeExpenses, total };
  }, [categoryExpenses]);

  const barChartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const results: Record<string, { monthKey: string; name: string; income: number; expense: number }> = {};
    
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      results[key] = {
        monthKey: key,
        name: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        income: 0,
        expense: 0
      };
    }

    filteredTransactions.forEach(tx => {
      const txMonth = tx.date.slice(0, 7);
      if (results[txMonth]) {
        if (tx.type === "income") results[txMonth].income += tx.amount;
        else results[txMonth].expense += tx.amount;
      }
    });

    return Object.values(results);
  }, [filteredTransactions]);

  const farmPerformanceList = useMemo(() => {
    return farms.map((f) => {
      let income = 0;
      let expense = 0;
      transactions.forEach((tx) => {
        if (tx.farm_id === f.id) {
          if (tx.type === "income") income += tx.amount;
          else expense += tx.amount;
        }
      });

      const budget = farmBudgets[f.id] || 0;
      const profit = income - expense;

      return {
        id: f.id,
        name: f.field_name ? (f.field_name.includes("|||") ? f.field_name.split("|||")[0] : f.field_name) : "Unnamed Field",
        crop: f.intended_crop || "General",
        income,
        expense,
        profit,
        budget
      };
    });
  }, [farms, transactions, farmBudgets]);

  const peerLoanStats = useMemo(() => {
    let borrowed = 0;
    let lent = 0;
    const reminders: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    transactions.forEach((tx: any) => {
      if (tx.is_peer_debt && tx.debt_status === "pending") {
        if (selectedFarmId !== "all" && tx.farm_id !== selectedFarmId) return;

        if (tx.type === "income") {
          borrowed += tx.amount;
        } else {
          lent += tx.amount;
        }

        if (tx.due_date) {
          const dueDateObj = new Date(tx.due_date);
          dueDateObj.setHours(0, 0, 0, 0);
          const diffTime = dueDateObj.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          reminders.push({
            id: tx.id,
            peerName: tx.peer_name || "Someone",
            amount: tx.amount,
            type: tx.type, // 'income' means borrowed, 'expense' means lent
            dueDate: tx.due_date,
            daysLeft: diffDays,
            crop: tx.crop
          });
        }
      }
    });

    reminders.sort((a, b) => a.daysLeft - b.daysLeft);

    return { borrowed, lent, reminders };
  }, [transactions, selectedFarmId]);

  const financialAnalysis = useMemo(() => {
    const profit = stats.netProfit;
    const isProfit = profit >= 0;
    const profitVal = formatCurrency(Math.abs(profit));
    const earningsVal = formatCurrency(stats.income);
    const expensesVal = formatCurrency(stats.expense);
    const lentVal = formatCurrency(peerLoanStats.lent);
    const borrowedVal = formatCurrency(peerLoanStats.borrowed);
    
    let text = "";
    let status = ""; // 'profit' | 'loss' | 'neutral'
    let title = "";

    if (stats.income === 0 && stats.expense === 0) {
      return {
        status: "neutral",
        title: "Start Logging Data",
        text: "Log your crop expenses (seeds, water, labor) and crop sales to get a real-time financial health check."
      };
    }

    if (isProfit) {
      status = "profit";
      title = "Farming Profit Zone";
      text = `Looking Good! You are currently in a Net Profit of ${profitVal} for this crop cycle (Earnings: ${earningsVal}, Expenses: ${expensesVal}). Your crop sales outweigh your seasonal input costs. Keep maintaining this positive margin!`;
    } else {
      status = "loss";
      title = "Input Cost Alert (Loss)";
      text = `Take Care! You are currently in a Net Loss of ${profitVal} (Earnings: ${earningsVal}, Expenses: ${expensesVal}). Your farming inputs and costs are higher than your sales. Check your category costs to see where you can save on labor, fertilizers, or machinery.`;
    }

    if (peerLoanStats.lent > 0) {
      text += ` Additionally, you have lent out ${lentVal} to others. Since they will pay you back, this money is counted in your available left money and will help recover your actual balance once repaid.`;
    }
    if (peerLoanStats.borrowed > 0) {
      text += ` Keep in mind that you owe ${borrowedVal} to lenders. Allocate a portion of your incoming crop sales to clear these borrowings on time.`;
    }

    return {
      status,
      title,
      text
    };
  }, [stats, peerLoanStats]);


  const handleOpenAddModal = () => {
    if (selectedFarmId !== "all") {
      setNewFarmId(selectedFarmId);
    } else {
      setNewFarmId("general");
    }
    setIsPeerDebt(false);
    setPeerName("");
    setDueDate("");
    setIsAddOpen(true);
  };

  const handleOpenBudgetPrompt = () => {
    if (selectedFarmId === "all") return;
    setTempBudgetInput(String(farmBudgets[selectedFarmId] || ""));
    setIsBudgetPromptOpen(true);
  };

  let accumulatedPercent = 0;
  const donutSlices = useMemo(() => {
    if (donutData.total === 0) return [];
    return donutData.data.map((slice) => {
      const percent = slice.value / donutData.total;
      const startPercent = accumulatedPercent;
      accumulatedPercent += percent;
      return {
        ...slice,
        percent,
        startPercent
      };
    });
  }, [donutData]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Type,Category,Farm,Crop,Amount (INR),Description\n";
    
    filteredTransactions.forEach(t => {
      const farmName = getFarmDisplayName(t.farm_id);
      csvContent += `${t.date},${t.type},"${t.category}","${farmName}","${t.crop}",${t.amount},"${t.description.replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `farm_budget_report_${selectedFarmId === "all" ? "overall" : selectedFarmId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading indicator
  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-slate-500 font-semibold font-inter">Loading live Supabase ledger...</p>
      </div>
    );
  }

  // Database Schema Warning View
  if (dbError) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-2xl text-red-600 border border-red-200">
            <Database className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 font-sora">Database Setup Required</h2>
            <p className="text-slate-500 text-xs mt-0.5">Setup tables to save logs</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-semibold">
          <p className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl border border-red-200 text-xs">
            Error details: <code className="font-mono">{dbError}</code>
          </p>
          <p>
            Please execute the SQL script in your Supabase SQL Editor to prepare your tables.
          </p>
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Steps to follow:</h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1">
              <li>Open your Supabase Dashboard.</li>
              <li>Go to the **SQL Editor** tab in the sidebar.</li>
              <li>Copy SQL code from:</li>
              <li className="font-bold underline text-blue-600 list-none pl-4">
                <a href="file:///d:/projects/Farmveda/farmveda/supabase_schema.sql" target="_blank" rel="noreferrer">
                  supabase_schema.sql (in root folder)
                </a>
              </li>
              <li>Paste the SQL script and click the **Run** button.</li>
            </ol>
          </div>
        </div>

        <button 
          onClick={loadBudgetsAndTransactions}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-6 rounded-2xl transition-all cursor-pointer shadow-md"
        >
          <RefreshCw className="h-4 w-4" />
          Check DB Connection Again
        </button>
      </div>
    );
  }

  // Setup prompt if NO Farms registered in DB
  if (farms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-3xl p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="h-16 w-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 mb-4">
          <Sprout className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 font-sora">No Farms Registered</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Please add a farm field first. Go to your dashboard and click **Add Farm Field** to get started. Once you register a farm field, you will be able to track budgets, expenses, and profits here.
        </p>
        <button 
          onClick={() => window.dispatchEvent(new Event('openAddFarmWizard'))}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-8 rounded-2xl transition-all cursor-pointer shadow-md"
        >
          Add Farm Field
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-inter pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sora flex items-center gap-2.5">
            Farm Budget & Expense Tracker
            <Sparkles className="h-6 w-6 text-emerald-500 animate-pulse" />
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your farming costs (seeds, labor, water) and crop sales to see your exact profits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Expense / Income
          </button>
        </div>
      </div>

      {/* FARM SELECTOR TABS BAR */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1.5 items-center border border-slate-200">
        <button
          onClick={() => setSelectedFarmId("all")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            selectedFarmId === "all"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          🌐 All Fields (Overall)
        </button>
        <div className="h-6 w-[1px] bg-slate-300 hidden sm:block" />
        {farms.map((f) => {
          const hasBudget = farmBudgets[f.id] > 0;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFarmId(f.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedFarmId === f.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-950 bg-white border border-slate-200"
              }`}
            >
              <span>🌾 {f.field_name ? (f.field_name.includes("|||") ? f.field_name.split("|||")[0] : f.field_name) : "Field"}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                selectedFarmId === f.id 
                  ? "bg-white/20 text-white" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                {f.intended_crop || "Crop"}
              </span>
              {!hasBudget && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* PEER LOAN REPAYMENT WARNING ALERTS */}
      {peerLoanStats.reminders.filter(r => r.daysLeft <= 7).length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
          {peerLoanStats.reminders.filter(r => r.daysLeft <= 7).map((r) => {
            const isOverdue = r.daysLeft < 0;
            const isOwe = r.type === "income"; // You borrowed it

            return (
              <div 
                key={r.id} 
                className={`border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
                  isOverdue 
                    ? "bg-red-50 border-red-900 text-red-955" 
                    : "bg-amber-50 border-amber-900 text-amber-955"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border border-slate-900 ${
                    isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black">
                      {isOwe ? "⚠️ Time to Pay Back (You Borrowed)" : "💰 Time to Collect (You Lent)"}
                    </h4>
                    <p className="text-xs mt-0.5 font-medium">
                      {isOwe 
                        ? `Pay back ${formatCurrency(r.amount)} to ${r.peerName} for crop ${r.crop}.` 
                        : `Collect ${formatCurrency(r.amount)} from ${r.peerName} for crop ${r.crop}.`}
                      <span className="font-extrabold mx-1">
                        {isOverdue 
                          ? `LATE BY ${Math.abs(r.daysLeft)} DAYS (Due date: ${r.dueDate})` 
                          : `Due in ${r.daysLeft} days (Due date: ${r.dueDate})`}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleSettleDebt(r.id)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    Mark as Paid
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NO BUDGET INITIAL PROMPT FOR FARM */}
      {isBudgetMissingForSelected && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-slate-900 shadow-[5px_5px_0px_rgba(15,23,42,1)] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-2xl text-amber-700 border border-amber-200">
              <PiggyBank className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 font-sora">
                Set Spending Limit for {getFarmDisplayName(selectedFarmId)}
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl">
                Set a spending limit for this crop season. We will show you visual warnings when your expenses go near this limit!
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenBudgetPrompt}
            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl transition-all cursor-pointer shrink-0 shadow-[2px_2px_0px_rgba(15,23,42,0.15)]"
          >
            🏁 Set Spending Limit
          </button>
        </div>
      )}

      {/* METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Budget Ceiling */}
        <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5 relative hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedFarmId === "all" ? "Spending Limit" : "My Spending Limit"}
            </span>
            {selectedFarmId !== "all" && (
              <button 
                onClick={handleOpenBudgetPrompt}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Change Limit
              </button>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 font-sora">
              {stats.estimatedBudget > 0 ? formatCurrency(stats.estimatedBudget) : "Not Set"}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {selectedFarmId === "all" ? "Total limit for all farms" : `Crop: ${farmsMap[selectedFarmId]?.intended_crop || "General"}`}
            </p>
          </div>
        </div>

        {/* Card 2: Actual Expenses */}
        <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Spent</span>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 font-sora text-red-600">{formatCurrency(stats.expense)}</h3>
            <p className="text-slate-400 text-xs mt-1">Seeds, fertilizers, wages, fuel</p>
          </div>
        </div>

        {/* Card 3: Remaining Budget */}
        <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Money Left to Spend</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 font-sora text-emerald-600">
              {stats.estimatedBudget > 0 ? formatCurrency(stats.remainingBudget + peerLoanStats.lent) : "N/A"}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {peerLoanStats.lent > 0 
                ? `Includes ${formatCurrency(peerLoanStats.lent)} lent out` 
                : "Operational breathing room"}
            </p>
          </div>
        </div>

        {/* Card 4: Net Farm Profit */}
        <div 
          onClick={() => setIsAnalysisOpen(true)}
          className="bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] transition-all cursor-pointer hover:border-blue-500 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Profit / Loss</span>
            <div className={`p-2 rounded-lg ${stats.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {stats.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h3 className={`text-2xl font-black font-sora ${stats.netProfit >= 0 ? "text-slate-900" : "text-red-600"}`}>
                {formatCurrency(stats.netProfit)}
              </h3>
              <p className="text-slate-400 text-xs mt-1">Earnings minus expenses</p>
            </div>
            <span className="text-[10px] font-bold text-blue-600 underline opacity-70 group-hover:opacity-100 transition-opacity">
              View Report
            </span>
          </div>
        </div>

      </div>

      {/* DYNAMIC PROGRESS LINE FOR BUDGET EXPENDITURE */}
      {stats.estimatedBudget > 0 && (
        <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[3px_3px_0px_rgba(15,23,42,1)] p-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Spending Limit Tracker</span>
              {stats.budgetUsagePercent >= 100 && (
                <span className="bg-red-50 text-red-600 text-[10px] font-black border border-red-200 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  ⚠️ Over Budget!
                </span>
              )}
            </div>
            <span className="text-sm font-black text-slate-900">
              {stats.budgetUsagePercent.toFixed(0)}% spent <span className="text-slate-400 font-normal">({formatCurrency(stats.expense)} of {formatCurrency(stats.estimatedBudget)})</span>
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-700 ${
                stats.budgetUsagePercent >= 100 
                  ? "bg-red-500" 
                  : stats.budgetUsagePercent >= 80 
                  ? "bg-amber-500" 
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(stats.budgetUsagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* CHARTS GRAPH CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Cash Flow Bar Chart */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-sora">Monthly Income vs Expenses</h3>
              <p className="text-slate-500 text-xs">Compare what you earned vs what you spent</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Earnings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span>Expenses</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full flex items-end justify-between px-2 pt-4 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-4">
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
            </div>

            {barChartData.map((data) => {
              const maxVal = Math.max(...barChartData.map(d => Math.max(d.income, d.expense)), 10000);
              const incomeHeight = `${(data.income / maxVal) * 160}px`;
              const expenseHeight = `${(data.expense / maxVal) * 160}px`;

              return (
                <div key={data.monthKey} className="flex flex-col items-center flex-1 group z-10">
                  <div className="flex items-end gap-1.5 sm:gap-2 mb-2 relative h-40">
                    
                    {/* Income */}
                    <div 
                      style={{ height: incomeHeight }}
                      className="w-4 sm:w-6 bg-blue-50 hover:bg-blue-600 rounded-t-sm transition-all duration-500 border border-slate-900 bg-blue-500 relative group-hover:scale-y-[1.03]"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded-md shadow pointer-events-none whitespace-nowrap z-20">
                        Earned: {formatCurrency(data.income)}
                      </div>
                    </div>

                    {/* Expense */}
                    <div 
                      style={{ height: expenseHeight }}
                      className="w-4 sm:w-6 bg-red-400 hover:bg-red-500 rounded-t-sm transition-all duration-500 border border-slate-900 relative group-hover:scale-y-[1.03]"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded-md shadow pointer-events-none whitespace-nowrap z-20">
                        Spent: {formatCurrency(data.expense)}
                      </div>
                    </div>

                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{data.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses Category (SVG Donut) */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sora">Where Did I Spend Money?</h3>
            <p className="text-slate-500 text-xs mb-4">Distribution of seeds, fertilizers, labor, tractor rental, etc.</p>
          </div>

          {donutData.total > 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="10" />
                  {donutSlices.map((slice, idx) => {
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDasharray = `${slice.percent * circumference} ${circumference}`;
                    const strokeDashoffset = -slice.startPercent * circumference;
                    const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#8B5CF6", "#14B8A6", "#64748B"];
                    const strokeColor = colors[idx % colors.length];

                    return (
                      <circle
                        key={slice.name}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={strokeColor}
                        strokeWidth={hoveredSlice === idx ? "12" : "10"}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredSlice(idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    );
                  })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  {hoveredSlice !== null ? (
                    <>
                      <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{donutSlices[hoveredSlice].name}</span>
                      <span className="text-sm font-extrabold text-slate-900 font-sora">{formatCurrency(donutSlices[hoveredSlice].value)}</span>
                      <span className="text-[10px] font-bold text-slate-500">{(donutSlices[hoveredSlice].percent * 100).toFixed(0)}%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Spent</span>
                      <span className="text-lg font-black text-slate-900 font-sora">{formatCurrency(donutData.total)}</span>
                      <span className="text-[9px] text-slate-500 font-bold">Seeds, Labor, Tractor etc.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend Grid */}
              <div className="w-full grid grid-cols-2 gap-2 mt-4 text-xs font-semibold overflow-y-auto max-h-24 scrollbar-none">
                {donutSlices.map((slice, idx) => {
                  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-blue-500", "bg-pink-500", "bg-purple-500", "bg-teal-500", "bg-slate-500"];
                  return (
                    <div 
                      key={slice.name}
                      onMouseEnter={() => setHoveredSlice(idx)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded transition-all truncate cursor-pointer ${
                        hoveredSlice === idx ? "bg-slate-50 scale-105" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${colors[idx % colors.length]}`} />
                      <span className="text-slate-600 text-[10px] truncate">{slice.name}</span>
                      <span className="text-slate-400 text-[9px] ml-auto">{(slice.percent * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
              <Info className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-400 text-xs">No input costs logged for this field selection.</p>
            </div>
          )}
        </div>

      </div>

      {/* MULTI-FIELD PERFORMANCE & PEER LOANS SECTIONS */}
      {selectedFarmId === "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Multi-Field Cultivation Performance Table */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 font-sora">My Field Profits (Comparison)</h3>
              <p className="text-slate-500 text-xs">Compare what you spent and what you earned across all your different farm fields</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Farm Field</th>
                    <th className="py-3 px-4">Crop Grown</th>
                    <th className="py-3 px-4 text-right">Spending Limit</th>
                    <th className="py-3 px-4 text-right">Spent So Far</th>
                    <th className="py-3 px-4 text-right">Earnings (Sales)</th>
                    <th className="py-3 px-4 text-right">Net Profit/Loss</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                  {farmPerformanceList.map((fp) => {
                    const isProfit = fp.profit >= 0;
                    const ratio = fp.budget > 0 ? (fp.expense / fp.budget) * 100 : 0;

                    return (
                      <tr key={fp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{fp.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            {fp.crop}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">{fp.budget > 0 ? formatCurrency(fp.budget) : "Not Set"}</td>
                        <td className="py-3.5 px-4 text-right text-red-600">{formatCurrency(fp.expense)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600">{formatCurrency(fp.income)}</td>
                        <td className={`py-3.5 px-4 text-right font-black ${isProfit ? "text-slate-900" : "text-red-500"}`}>
                          {formatCurrency(fp.profit)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {fp.budget > 0 ? (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              ratio >= 100 
                                ? "bg-red-100 text-red-700" 
                                : ratio >= 80 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {ratio.toFixed(0)}% budget
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">No Limit</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Outstanding Peer Loans & Debts Ledger */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-sora">Udhaar (Lent / Borrowed Money)</h3>
              <p className="text-slate-500 text-xs mb-4">Keep track of money you borrowed from lenders/banks, or money you lent to workers/neighbors</p>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 flex-1">
              {peerLoanStats.reminders.length > 0 ? (
                peerLoanStats.reminders.map((loan) => {
                  const isOwe = loan.type === "income"; // income means we borrowed it
                  
                  return (
                    <div key={loan.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm truncate">{loan.peerName}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isOwe ? "bg-red-150 text-red-750 border border-red-200" : "bg-blue-150 text-blue-750 border border-blue-200"
                          }`}>
                            {isOwe ? "Owe to repay" : "Need to collect"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Crop: {loan.crop} | Pay/Collect Date: <span className="font-bold">{loan.dueDate}</span>
                        </p>
                        <p className={`text-[10px] font-bold ${loan.daysLeft < 0 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                          {loan.daysLeft < 0 ? `Late by ${Math.abs(loan.daysLeft)} days` : `${loan.daysLeft} days remaining`}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-sm font-black ${isOwe ? "text-red-600" : "text-slate-900"}`}>
                          {formatCurrency(loan.amount)}
                        </span>
                        <button
                          onClick={() => handleSettleDebt(loan.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-sm"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <PiggyBank className="h-8 w-8 text-slate-200 mb-1" />
                  <p className="text-xs font-semibold">No active borrowing or lending found.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* FILTER & TRANSACTION LOG TABLE */}
      <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_rgba(15,23,42,1)] overflow-hidden">
        
        {/* Table Header Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by notes, crop, or farm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
            
            {/* Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-[10px]">Type:</span>
              <select 
                value={typeFilter} 
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none"
              >
                <option value="all">All Transactions</option>
                <option value="income">Earnings (+)</option>
                <option value="expense">Expenses (-)</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-[10px]">Category:</span>
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none max-w-[150px]"
              >
                <option value="all">All Categories</option>
                <option value="" disabled>--- Expenses ---</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="" disabled>--- Income ---</option>
                {INCOME_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Transactions list */}
        <div className="overflow-x-auto">
          {filteredTransactions.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Farm Field</th>
                  <th className="py-3.5 px-6">Crop</th>
                  <th className="py-3.5 px-6">Type of Expense / Income</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {filteredTransactions.map((tx) => {
                  const isInc = tx.type === "income";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 text-slate-500 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{tx.date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-800">{tx.description}</td>
                      <td className="py-3.5 px-6">
                        <span className="text-slate-600 font-bold">
                          {getFarmDisplayName(tx.farm_id)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                          {tx.crop}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isInc ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className={`py-3.5 px-6 text-right font-black text-sm ${
                        isInc ? "text-emerald-600" : "text-slate-900"
                      }`}>
                        {isInc ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button 
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <FileText className="h-10 w-10 text-slate-200 mb-2" />
              <p className="text-sm font-semibold">No entries logged matching filters.</p>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setCategoryFilter("all");
                }}
                className="text-xs font-bold text-blue-600 mt-2 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD TRANSACTION MODAL DIALOG --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            <div className="bg-slate-900 p-5 flex items-center justify-between text-white border-b-2 border-slate-900">
              <h3 className="text-lg font-black font-sora">Add Expense / Income</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="p-6 space-y-5">
              {/* Type selector */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Is this an Expense or Income?</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button 
                    type="button"
                    onClick={() => {
                      setNewType("expense");
                      setNewCategory(EXPENSE_CATEGORIES[0]);
                    }}
                    className={`py-3 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                      newType === "expense" 
                        ? "bg-slate-900 text-white shadow-md" 
                        : "text-slate-500 hover:text-slate-950 font-bold"
                    }`}
                  >
                    I Spent Money (Expense)
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setNewType("income");
                      setNewCategory(INCOME_CATEGORIES[0]);
                    }}
                    className={`py-3 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                      newType === "income" 
                        ? "bg-slate-900 text-white shadow-md" 
                        : "text-slate-500 hover:text-slate-955 font-bold"
                    }`}
                  >
                    I Earned Money (Income)
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Amount (₹)</label>
                <input 
                  type="number"
                  required
                  placeholder="Enter amount, e.g. 15000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-slate-900"
                />
              </div>

              {/* Link to Farm */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Select Farm Field</label>
                <select 
                  value={newFarmId} 
                  onChange={(e) => setNewFarmId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-700 animate-in"
                >
                  <option value="general">General (Not linked to any field)</option>
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.field_name ? (f.field_name.includes("|||") ? f.field_name.split("|||")[0] : f.field_name) : "Field"} ({f.intended_crop || "No Crop"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Crop Override (only if general selected) */}
              {newFarmId === "general" && (
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Crop Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Paddy, Cotton, Wheat..."
                    value={newCropOverride}
                    onChange={(e) => setNewCropOverride(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Spent On (Category)</label>
                  <select 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-700"
                  >
                    {(newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Date</label>
                  <input 
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* PEER DEBT CHECKBOX TOGGLE */}
              <div className="flex items-center gap-2.5 pt-2">
                <input 
                  type="checkbox"
                  id="isPeerDebt"
                  checked={isPeerDebt}
                  onChange={(e) => setIsPeerDebt(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isPeerDebt" className="text-sm font-black text-slate-700 cursor-pointer select-none">
                  Is this Udhaar? (Money Lent / Borrowed)
                </label>
              </div>

              {/* PEER DEBT EXTENDED FORM FIELDS */}
              {isPeerDebt && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      {newType === "income" ? "Who gave you money? (Lender Name)" : "Who did you give money? (Borrower Name)"}
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Ram Singh"
                      value={peerName}
                      onChange={(e) => setPeerName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      When will you pay back / collect?
                    </label>
                    <input 
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500 block mb-2">Notes / Details (e.g. Bought 5 bags of Urea)</label>
                <input 
                  type="text"
                  placeholder="Notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-3.5 rounded-xl text-base font-extrabold border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer text-slate-700 text-center animate-in"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl text-base font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer text-center shadow-md border-2 border-blue-600"
                >
                  Save Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- SET BUDGET PROMPT MODAL --- */}
      {isBudgetPromptOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
              <h3 className="text-base font-extrabold font-sora">Set Spending Limit for this Farm</h3>
              <button 
                onClick={() => setIsBudgetPromptOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSetEstimatedBudget} className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Farm Field</span>
                <span className="text-sm font-bold text-slate-800 block bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {getFarmDisplayName(selectedFarmId)}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Enter Spending Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₹</span>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 60000"
                    value={tempBudgetInput}
                    onChange={(e) => setTempBudgetInput(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  We will warn you when your expenses go near this limit.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsBudgetPromptOpen(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer text-center font-bold shadow-md"
                >
                  Save Limit
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- SMART ADVISOR ANALYSIS REPORT MODAL --- */}
      {isAnalysisOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] rounded-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            <div className="bg-slate-900 p-5 flex items-center justify-between text-white border-b-2 border-slate-900">
              <h3 className="text-lg font-black font-sora flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Smart Advisor Report
              </h3>
              <button 
                onClick={() => setIsAnalysisOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              <div className={`p-4 rounded-xl border-2 border-slate-900 ${
                financialAnalysis.status === "profit" 
                  ? "bg-emerald-50 text-emerald-950 border-emerald-900" 
                  : financialAnalysis.status === "loss" 
                  ? "bg-red-50 text-red-955 border-red-900" 
                  : "bg-blue-50 text-blue-955 border-blue-900"
              }`}>
                <h4 className="text-base font-black mb-2 flex items-center gap-1.5">
                  {financialAnalysis.status === "profit" ? "🎉" : "⚠️"}
                  {financialAnalysis.title}
                </h4>
                <p className="text-sm font-medium leading-relaxed">
                  {financialAnalysis.text}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 text-xs sm:text-sm font-semibold">
                <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Actual Farming Profit breakdown:</h5>
                <div className="flex justify-between">
                  <span className="text-slate-500">Crop Sales & Subsidies (Earnings):</span>
                  <span className="text-emerald-600 font-extrabold">{formatCurrency(stats.cropIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Farming Inputs & Costs (Expenses):</span>
                  <span className="text-red-500 font-extrabold">{formatCurrency(stats.cropExpense)}</span>
                </div>
                <hr className="border-slate-200" />
                <div className="flex justify-between text-base font-black">
                  <span>Net Crop Profit/Loss:</span>
                  <span className={financialAnalysis.status === "profit" ? "text-slate-900" : "text-red-605"}>
                    {formatCurrency(stats.netProfit)}
                  </span>
                </div>
              </div>

              {(peerLoanStats.lent > 0 || peerLoanStats.borrowed > 0) && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs sm:text-sm font-semibold">
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Outstanding Udhaar (Lent / Borrowed):</h5>
                  {peerLoanStats.lent > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>Lent Money (Collect Back):</span>
                      <span>+{formatCurrency(peerLoanStats.lent)}</span>
                    </div>
                  )}
                  {peerLoanStats.borrowed > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Borrowed Money (Pay Back):</span>
                      <span>-{formatCurrency(peerLoanStats.borrowed)}</span>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={() => setIsAnalysisOpen(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md text-center"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
