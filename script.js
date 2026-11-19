"use strict";

/* =================================
   PC SAVER COMPLETE VERSION
================================= */

const STORAGE_KEY = "pcSaverData";

const defaultData = {
  monthlyAllowance: 10000,
  dailyLimit: 300,
  monthlyBudget: 10000,
  goalAmount: 200000,
  monthlyTarget: 20000,
  deadline: "",
  totalSavings: 0,
  lastMonth: getCurrentMonth(),
  history: []
};

let data = loadData();

/* 日付 */

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentMonth() {
  return getToday().slice(0, 7);
}

/* データ読み込み */

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...defaultData, history: [] };

    const parsed = JSON.parse(saved);

    return {
      ...defaultData,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch (e) {
    console.error(e);
    return { ...defaultData, history: [] };
  }
}

/* 保存 */

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    alert("保存できませんでした。");
    return false;
  }
}

/* 共通 */

function yen(value) {
  return "¥" + Math.max(0, value).toLocaleString("ja-JP");
}

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).slice(2);
}

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const e = el(id);
  if (e) e.textContent = value;
}

function getNumber(id) {
  const e = el(id);
  if (!e || e.value.trim() === "") return null;

  const n = Number(e.value);

  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/* 集計 */

function getTodaySpent() {
  return data.history
    .filter(x => x.date === getToday() && x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);
}

function getMonthExpenses() {
  return data.history
    .filter(x => x.date.startsWith(getCurrentMonth()) && x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);
}

function getMonthDeposits() {
  return data.history
    .filter(x => x.date.startsWith(getCurrentMonth()) && x.type === "deposit")
    .reduce((s, x) => s + x.amount, 0);
}

/* 設定 */

function loadSettings() {
  const mapping = {
    monthlyAllowance: data.monthlyAllowance,
    dailyLimit: data.dailyLimit,
    goalInput: data.goalAmount,
    monthlyBudget: data.monthlyBudget,
    monthlyTargetInput: data.monthlyTarget,
    deadlineInput: data.deadline
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const element = el(id);
    if (element) {
      element.value = value ?? "";
    }
  });
}

function saveSettings() {
  const allowance = getNumber("monthlyAllowance");
  const limit = getNumber("dailyLimit");
  const goal = getNumber("goalInput");
  const budget = el("monthlyBudget")
    ? getNumber("monthlyBudget")
    : getNumber("monthlyAllowance");
  const monthlyTarget = getNumber("monthlyTargetInput");
  const deadline = el("deadlineInput")?.value || "";

  if ([allowance, limit, goal, budget, monthlyTarget].some(x => x === null) || goal === 0) {
    alert("正しい金額を入力してください。");
    return;
  }

  data.monthlyAllowance = allowance;
  data.dailyLimit = limit;
  data.goalAmount = goal;
  data.monthlyBudget = budget;
  data.monthlyTarget = monthlyTarget;
  data.deadline = deadline;

  if (!saveData()) return;

  updateDisplay();
  alert("設定を保存しました！あなたのペースで楽しく貯めていきましょう！");
}

/* 支出 */

function addExpense() {
  const name = el("expenseName")?.value.trim();
  const amount = getNumber("expenseAmount");

  if (!name) {
    alert("使った内容を入力してください。");
    return;
  }

  if (amount === null || amount <= 0) {
    alert("正しい金額を入力してください。");
    return;
  }

  const over = getTodaySpent() + amount - data.dailyLimit;

  if (over > 0 && !confirm(
    "今日の目安額を " + yen(over) + " ほど超えそうですが、このまま記録しますか？"
  )) return;

  data.history.unshift({
    id: createId(),
    type: "expense",
    name,
    amount,
    date: getToday()
  });

  if (!saveData()) {
    data = loadData();
    return;
  }

  el("expenseName").value = "";
  el("expenseAmount").value = "";

  updateDisplay();
  alert("支出を記録しました！");
}

/* 貯金 */

function addDeposit() {
  const amount = getNumber("depositAmount");

  if (amount === null || amount <= 0) {
    alert("正しい金額を入力してください。");
    return;
  }

  if (!Number.isSafeInteger(data.totalSavings + amount)) {
    alert("金額が大きすぎます。");
    return;
  }

  const prevMonthDeposits = getMonthDeposits();
  const prevTotal = data.totalSavings;

  data.totalSavings += amount;

  data.history.unshift({
    id: createId(),
    type: "deposit",
    name: "貯金",
    amount,
    date: getToday()
  });

  if (!saveData()) {
    data = loadData();
    return;
  }

  el("depositAmount").value = "";
  updateDisplay();

  const newMonthDeposits = getMonthDeposits();

  // 目標達成・今月の目標達成時の祝福メッセージ
  if (prevTotal < data.goalAmount && data.totalSavings >= data.goalAmount) {
    alert("🎉🎊 おめでとうございます！！ついに目標金額を達成しました！！最高のゲーミングPCをお迎えしましょう！🎊🎉");
  } else if (data.monthlyTarget > 0 && prevMonthDeposits < data.monthlyTarget && newMonthDeposits >= data.monthlyTarget) {
    alert(`🌟 すごい！今月の貯金目標（${yen(data.monthlyTarget)}）を達成しました！その調子です！👏`);
  } else {
    alert(`ナイス貯金！${yen(amount)} 積み立てました！着実にPCに近づいています✨`);
  }
}

/* 月間予算 */

function updateBudget() {
  const spent = getMonthExpenses();
  const budget = data.monthlyBudget;
  const remaining = Math.max(0, budget - spent);
  const percent = budget > 0 ? Math.min(100, spent / budget * 100) : 0;

  setText("monthlySpent", yen(spent));
  setText("monthlyRemaining", yen(remaining));
  setText("monthlyBudgetPercent", percent.toFixed(1) + "%");

  const bar = el("monthlyBudgetBar");

  if (bar) {
    bar.style.width = percent + "%";
    bar.style.background = percent >= 100
      ? "#fb7185"
      : percent >= 80 ? "#fbbf24" : "#34d399";
  }

  setText("monthlyBudgetStatus",
    budget <= 0 ? "予算未設定"
      : spent > budget ? "今月は少し予算オーバー中。来月また調整しよう！"
      : percent >= 80 ? "予算の8割に到達！残りはゆっくり使おう"
      : "バッチリ予算内でコントロールできています！"
  );
}

/* 月間グラフ */

function updateMonthlyChart() {
  const canvas = el("monthlyChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 320;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const month = getCurrentMonth();
  const [year, m] = month.split("-").map(Number);
  const days = new Date(year, m, 0).getDate();

  const expenses = Array(days).fill(0);
  const deposits = Array(days).fill(0);

  data.history.forEach(item => {
    if (!item.date.startsWith(month)) return;

    const day = Number(item.date.slice(8, 10)) - 1;
    if (day < 0 || day >= days) return;

    if (item.type === "expense") expenses[day] += item.amount;
    if (item.type === "deposit") deposits[day] += item.amount;
  });

  const max = Math.max(1000, ...expenses, ...deposits);
  const left = 35, right = 10, top = 20, bottom = 30;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const step = chartW / days;
  const barW = Math.max(2, step * 0.32);

  ctx.strokeStyle = "rgba(255,255,255,.12)";

  for (let i = 0; i <= 4; i++) {
    const y = top + chartH * i / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
  }

  for (let i = 0; i < days; i++) {
    const x = left + step * i;

    ctx.fillStyle = "#fb7185";
    ctx.fillRect(
      x + step * .08,
      top + chartH - expenses[i] / max * chartH,
      barW,
      expenses[i] / max * chartH
    );

    ctx.fillStyle = "#34d399";
    ctx.fillRect(
      x + step * .52,
      top + chartH - deposits[i] / max * chartH,
      barW,
      deposits[i] / max * chartH
    );
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";

  [1, 5, 10, 15, 20, 25, days].forEach(day => {
    ctx.fillText(String(day), left + step * (day - .5), height - 10);
  });

  ctx.fillStyle = "#fb7185";
  ctx.fillRect(left, 3, 9, 9);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText("支出", left + 13, 12);

  ctx.fillStyle = "#34d399";
  ctx.fillRect(left + 55, 3, 9, 9);
  ctx.fillStyle = "#fff";
  ctx.fillText("貯金", left + 68, 12);

  setText("monthlyIncome", yen(getMonthDeposits()));
  setText("monthlyExpense", yen(getMonthExpenses()));
  setText("monthlyBalance", yen(getMonthDeposits() - getMonthExpenses()));
}

/* 達成予想日 & 期限・不足額・今月目標の優しいフィードバック */

function updatePrediction() {
  const targetEl = el("achievementDate");
  const detailEl = el("estimateRemaining");
  if (!targetEl || !detailEl) return;

  const remainingTotal = data.goalAmount - data.totalSavings;
  const monthDeposits = getMonthDeposits();

  // 今月の貯金目標達成メッセージの生成
  let monthlyStatusHtml = "";
  if (data.monthlyTarget > 0) {
    if (monthDeposits >= data.monthlyTarget) {
      monthlyStatusHtml = `<br><span style="color:#34d399; font-weight:bold;">🎉 今月の貯金目標（${yen(data.monthlyTarget)}）クリア！素晴らしいです！</span>`;
    } else {
      const monthLeft = data.monthlyTarget - monthDeposits;
      monthlyStatusHtml = `<br><span style="color:#94a3b8;">今月の目標まであと ${yen(monthLeft)}（ゆっくり進めよう！）</span>`;
    }
  }

  // 1. 全体目標を達成済みの場合
  if (remainingTotal <= 0) {
    targetEl.textContent = "🎉 やったぜ！目標金額カンスト達成！";
    targetEl.style.color = "#22d3ee";
    detailEl.innerHTML = "本当におめでとうございます！ついに最高のゲーミングPCをお迎えする時が来ましたね！";
    detailEl.style.color = "#34d399";
    return;
  }

  targetEl.style.color = "var(--green)";

  // 2. 直近30日間の平均ペースから達成予想日を計算
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const startString = [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, "0"),
    String(start.getDate()).padStart(2, "0")
  ].join("-");

  const totalRecent = data.history
    .filter(x => x.type === "deposit" && x.date >= startString && x.date <= getToday())
    .reduce((s, x) => s + x.amount, 0);

  const averageDaily = totalRecent / 30;

  if (averageDaily <= 0) {
    targetEl.textContent = "最初の貯金を待っています 🌱";
    detailEl.innerHTML = `目標まであと ${yen(remainingTotal)}。まずは無理のない金額からスタートしよう！` + monthlyStatusHtml;
    detailEl.style.color = "var(--gray)";
    return;
  }

  const daysNeeded = Math.ceil(remainingTotal / averageDaily);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + daysNeeded);

  const projStr = `${projectedDate.getFullYear()}/${projectedDate.getMonth() + 1}/${projectedDate.getDate()} 頃`;
  targetEl.textContent = projStr;

  // 3. 期限日（deadline）が設定されている場合の判定
  if (data.deadline) {
    const deadlineDate = new Date(data.deadline);
    const todayDate = new Date();
    const diffTime = deadlineDate - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      detailEl.innerHTML = `☕ 目標日は過ぎましたが焦らなくて大丈夫！<br>あと <strong style="color:#fbbf24;">${yen(remainingTotal)}</strong> で達成です。マイペースに続けよう！` + monthlyStatusHtml;
      detailEl.style.color = "var(--gray)";
      return;
    }

    const requiredDaily = remainingTotal / diffDays;
    const requiredMonthly = requiredDaily * 30;

    if (projectedDate > deadlineDate) {
      // ペースが少し足りない場合（焦らせない優しい表現）
      const shortAmount = remainingTotal - Math.floor(averageDaily * diffDays);
      detailEl.innerHTML = `☕ 現在のペースだと期限までにあと <strong style="color:#fbbf24;">${yen(shortAmount)}</strong> ほど足りなそう。<br>でも焦らなくて大丈夫！月あたり約 ${yen(Math.round(requiredMonthly))} ペースを意識しつつ、できる範囲でコツコツいこう！` + monthlyStatusHtml;
      detailEl.style.color = "var(--gray)";
    } else {
      // 期限内に間に合う場合
      detailEl.innerHTML = `✨ いい調子！このペースならマイペースに期限内クリアできそう！（残り ${diffDays} 日）` + monthlyStatusHtml;
      detailEl.style.color = "#34d399";
    }
  } else {
    detailEl.innerHTML = `あと ${yen(remainingTotal)}（今のペースなら残り約 ${daysNeeded} 日）` + monthlyStatusHtml;
    detailEl.style.color = "var(--gray)";
  }
}

/* 実績・称号 */

function updateAchievements() {
  const achievements = [
    { amount: 1000, title: "🥉 貯金ビギナー" },
    { amount: 10000, title: "🥈 貯金チャレンジャー" },
    { amount: 50000, title: "🥇 貯金マスター" },
    { amount: 100000, title: "💎 貯金エキスパート" },
    { amount: 200000, title: "👑 PC SAVER レジェンド" }
  ];

  const unlocked = achievements.filter(x => data.totalSavings >= x.amount);

  setText(
    "currentTitle",
    unlocked.length
      ? unlocked[unlocked.length - 1].title
      : "🌱 貯金スタート"
  );

  setText("achievementCount", `${unlocked.length} / ${achievements.length}`);

  const list = el("achievementList");
  if (!list) return;

  list.replaceChildren();

  achievements.forEach(item => {
    const row = document.createElement("div");
    row.className = "achievement-item";

    const title = document.createElement("span");
    title.textContent = item.title;

    const status = document.createElement("span");
    status.textContent = data.totalSavings >= item.amount
      ? "✓ 達成！"
      : yen(item.amount);

    status.style.color = data.totalSavings >= item.amount
      ? "#34d399" : "#94a3b8";

    row.append(title, status);
    list.appendChild(row);
  });
}

/* 履歴 */

function renderHistory() {
  const list = el("historyList");
  if (!list) return;

  list.replaceChildren();

  if (data.history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "まだ記録がありません";
    list.appendChild(empty);
    return;
  }

  data.history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const info = document.createElement("div");
    info.className = "history-info";

    const name = document.createElement("strong");
    name.textContent = (item.type === "expense" ? "🛒 " : "💰 ") + item.name;

    const date = document.createElement("small");
    date.textContent = item.date;

    info.append(name, date);

    const right = document.createElement("div");
    right.className = "history-right";

    const amount = document.createElement("span");
    amount.className = item.type === "expense"
      ? "expense-amount" : "deposit-amount";

    amount.textContent = (item.type === "expense" ? "-" : "+") + yen(item.amount);

    const button = document.createElement("button");
    button.className = "delete-button";
    button.textContent = "削除";
    button.addEventListener("click", () => deleteHistory(item.id));

    right.append(amount, button);
    row.append(info, right);
    list.appendChild(row);
  });
}

/* 履歴削除 */

function deleteHistory(id) {
  const item = data.history.find(x => x.id === id);
  if (!item) return;

  if (!confirm("この記録を削除しますか？")) return;

  if (item.type === "deposit") {
    data.totalSavings = Math.max(0, data.totalSavings - item.amount);
  }

  data.history = data.history.filter(x => x.id !== id);

  if (!saveData()) {
    data = loadData();
    return;
  }

  updateDisplay();
}

/* バックアップ */

function exportBackup() {
  const backup = {
    app: "PC SAVER",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: data
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `pc-saver-backup-${getToday()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  alert("バックアップを保存しました！");
}

/* 復元 */

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert("ファイルサイズが大きすぎます。");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      const restored = backup.data && backup.app === "PC SAVER"
        ? backup.data : backup;

      if (
        !restored ||
        typeof restored !== "object" ||
        !Array.isArray(restored.history) ||
        !Number.isSafeInteger(restored.totalSavings) ||
        restored.totalSavings < 0 ||
        !Number.isSafeInteger(restored.goalAmount) ||
        restored.goalAmount <= 0
      ) {
        throw new Error("バックアップ形式が正しくありません。");
      }

      const valid = restored.history.every(item =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Number.isSafeInteger(item.amount) &&
        item.amount > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        ["expense", "deposit"].includes(item.type)
      );

      if (!valid) throw new Error("履歴データが不正です。");

      if (!confirm("現在のデータを復元データで置き換えますか？")) return;

      const previous = data;

      data = { ...defaultData, ...restored };

      if (!saveData()) {
        data = previous;
        return;
      }

      loadSettings();
      updateDisplay();

      alert("復元しました！");

    } catch (error) {
      alert("復元できませんでした。\n" + error.message);
    } finally {
      event.target.value = "";
    }
  };

  reader.onerror = () => {
    alert("ファイルを読み込めませんでした。");
    event.target.value = "";
  };

  reader.readAsText(file);
}

/* 月変更 */

function checkMonth() {
  const month = getCurrentMonth();

  if (data.lastMonth !== month) {
    data.lastMonth = month;
    saveData();
  }
}

/* 画面更新 */

function updateDisplay() {
  const spent = getTodaySpent();
  const remaining = Math.max(0, data.dailyLimit - spent);

  const percent = data.goalAmount > 0
    ? Math.min(100, data.totalSavings / data.goalAmount * 100)
    : 0;

  setText("totalSavings", yen(data.totalSavings));
  setText("todaySpent", yen(spent));
  setText("todayRemaining", yen(remaining));
  setText("goalAmount", "目標 " + yen(data.goalAmount));
  setText("progressPercent", percent.toFixed(1) + "%");

  if (el("progressBar")) {
    el("progressBar").style.width = percent + "%";
  }

  updateBudget();
  updateMonthlyChart();
  updatePrediction();
  updateAchievements();
  renderHistory();
}

/* イベント */

function setupEvents() {
  el("saveSettings")?.addEventListener("click", saveSettings);
  el("addExpense")?.addEventListener("click", addExpense);
  el("addDeposit")?.addEventListener("click", addDeposit);
  el("backupButton")?.addEventListener("click", exportBackup);
  el("restoreInput")?.addEventListener("change", importBackup);

  window.addEventListener("resize", updateMonthlyChart);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkMonth();
      updateDisplay();
    }
  });
}

/* 起動 */

function init() {
  checkMonth();
  loadSettings();
  setupEvents();
  updateDisplay();
  saveData();
}

init();