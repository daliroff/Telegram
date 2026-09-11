(function () {
  "use strict";

  var STORAGE_KEY = "cs2tracker.state.v1";

  /* ---------------- state ---------------- */

  var state = null;

  function newId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Could not read saved data, starting fresh.", e);
    }
    return null;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function sampleState() {
    var t1 = newId("t"), t2 = newId("t");
    var today = new Date();
    function offset(days) {
      var d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }

    var tournaments = [
      { id: t1, name: "IEM Katowice", organizer: "ESL", prizePool: 1000000, startDate: offset(-10), endDate: offset(-1) },
      { id: t2, name: "BLAST Premier: World Final", organizer: "BLAST", prizePool: 425000, startDate: offset(2), endDate: offset(9) }
    ];

    var m1 = newId("m"), m2 = newId("m"), m3 = newId("m"), m4 = newId("m");
    var matches = [
      { id: m1, tournamentId: t1, teamA: "Vitality", teamB: "Natus Vincere", format: "BO3", date: offset(-8), status: "completed", winner: "Vitality", scoreA: 2, scoreB: 0 },
      { id: m2, tournamentId: t1, teamA: "Spirit", teamB: "MOUZ", format: "BO3", date: offset(-5), status: "completed", winner: "MOUZ", scoreA: 1, scoreB: 2 },
      { id: m3, tournamentId: t2, teamA: "FaZe", teamB: "G2", format: "BO3", date: offset(3), status: "upcoming", winner: null, scoreA: null, scoreB: null },
      { id: m4, tournamentId: t2, teamA: "The MongolZ", teamB: "Falcons", format: "BO1", date: offset(4), status: "upcoming", winner: null, scoreA: null, scoreB: null }
    ];

    var bets = [
      { id: newId("b"), matchId: m1, pick: "Vitality", stake: 20, odds: 1.55, status: "won", placedAt: offset(-9) },
      { id: newId("b"), matchId: m2, pick: "Spirit", stake: 15, odds: 1.90, status: "lost", placedAt: offset(-6) }
    ];

    return { tournaments: tournaments, matches: matches, bets: bets };
  }

  function init() {
    state = loadState() || sampleState();
    saveState();
  }

  /* ---------------- helpers ---------------- */

  function money(n) {
    var v = Number(n) || 0;
    return (v < 0 ? "-" : "") + "$" + Math.abs(v).toFixed(2);
  }

  function fmtDate(iso) {
    if (!iso) return "TBD";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function tournamentById(id) {
    return state.tournaments.find(function (t) { return t.id === id; });
  }
  function matchById(id) {
    return state.matches.find(function (m) { return m.id === id; });
  }
  function matchesForTournament(tid) {
    return state.matches.filter(function (m) { return m.tournamentId === tid; });
  }
  function betsForMatch(mid) {
    return state.bets.filter(function (b) { return b.matchId === mid; });
  }

  function statusBadge(status) {
    var label = status.charAt(0).toUpperCase() + status.slice(1);
    return '<span class="badge badge-' + status + '">' + label + "</span>";
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* ---------------- derived stats ---------------- */

  function computeStats() {
    var settled = state.bets.filter(function (b) { return b.status === "won" || b.status === "lost"; });
    var wins = settled.filter(function (b) { return b.status === "won"; }).length;
    var losses = settled.filter(function (b) { return b.status === "lost"; }).length;
    var pending = state.bets.filter(function (b) { return b.status === "pending"; }).length;

    var totalStaked = settled.reduce(function (s, b) { return s + Number(b.stake); }, 0);
    var totalReturned = settled.reduce(function (s, b) {
      return s + (b.status === "won" ? Number(b.stake) * Number(b.odds) : 0);
    }, 0);
    var netPL = totalReturned - totalStaked;
    var roi = totalStaked > 0 ? (netPL / totalStaked) * 100 : 0;
    var winRate = settled.length > 0 ? (wins / settled.length) * 100 : 0;

    // current streak, based on chronological placedAt order
    var chron = settled.slice().sort(function (a, b) { return (a.placedAt || "").localeCompare(b.placedAt || ""); });
    var streak = 0, streakType = null;
    for (var i = chron.length - 1; i >= 0; i--) {
      var s = chron[i].status;
      if (streakType === null) { streakType = s; streak = 1; }
      else if (s === streakType) { streak++; }
      else break;
    }

    return {
      wins: wins, losses: losses, pending: pending, settledCount: settled.length,
      totalStaked: totalStaked, netPL: netPL, roi: roi, winRate: winRate,
      streak: streak, streakType: streakType
    };
  }

  /* ---------------- bet resolution ---------------- */

  function resolveBetsForMatch(match) {
    if (match.status !== "completed" || !match.winner) return;
    betsForMatch(match.id).forEach(function (bet) {
      if (bet.status !== "pending") return;
      bet.status = (bet.pick === match.winner) ? "won" : "lost";
    });
  }

  /* ---------------- rendering ---------------- */

  function renderAll() {
    renderDashboard();
    renderTournaments();
    renderMatches();
    renderBets();
    renderWinners();
  }

  function renderDashboard() {
    var stats = computeStats();

    document.getElementById("recWins").textContent = stats.wins;
    document.getElementById("recLosses").textContent = stats.losses;

    var total = stats.wins + stats.losses;
    var winPct = total > 0 ? (stats.wins / total) * 100 : 0;
    var lossPct = total > 0 ? 100 - winPct : 0;
    document.getElementById("recordBarWin").style.width = (total > 0 ? winPct : 50) + "%";
    document.getElementById("recordBarLoss").style.width = (total > 0 ? lossPct : 50) + "%";

    var streakText = "No bets settled yet";
    if (stats.streakType && stats.streak > 0) {
      streakText = stats.streak + "-bet " + (stats.streakType === "won" ? "win" : "loss") + " streak";
    }
    document.getElementById("recordStreak").textContent = streakText;
    document.getElementById("recordPending").textContent = stats.pending + " pending";

    var tiles = [
      { label: "Win rate", value: stats.settledCount ? stats.winRate.toFixed(1) + "%" : "—" },
      { label: "Settled bets", value: String(stats.settledCount) },
      { label: "Total staked", value: money(stats.totalStaked) },
      { label: "Net profit / loss", value: money(stats.netPL), cls: stats.netPL > 0 ? "positive" : (stats.netPL < 0 ? "negative" : "") },
      { label: "ROI", value: stats.totalStaked ? stats.roi.toFixed(1) + "%" : "—", cls: stats.roi > 0 ? "positive" : (stats.roi < 0 ? "negative" : "") },
      { label: "Pending bets", value: String(stats.pending) }
    ];
    var grid = document.getElementById("statGrid");
    grid.innerHTML = "";
    tiles.forEach(function (t) {
      grid.appendChild(el(
        '<div class="stat-tile"><div class="label">' + t.label + '</div>' +
        '<div class="value ' + (t.cls || "") + '">' + t.value + "</div></div>"
      ));
    });

    // upcoming/live matches
    var upcoming = state.matches
      .filter(function (m) { return m.status === "upcoming" || m.status === "live"; })
      .sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); })
      .slice(0, 5);
    var upcomingList = document.getElementById("upcomingList");
    upcomingList.innerHTML = "";
    if (upcoming.length === 0) {
      upcomingList.appendChild(el('<p class="empty-state">No upcoming matches. Add one from the Matches tab.</p>'));
    } else {
      upcoming.forEach(function (m) {
        var tour = tournamentById(m.tournamentId);
        upcomingList.appendChild(el(
          '<div class="mini-row"><div><strong>' + m.teamA + ' vs ' + m.teamB + '</strong>' +
          '<div class="meta">' + (tour ? tour.name : "—") + " · " + fmtDate(m.date) + '</div></div>' +
          statusBadge(m.status) + "</div>"
        ));
      });
    }

    // recent bets
    var recentBets = state.bets
      .slice()
      .sort(function (a, b) { return (b.placedAt || "").localeCompare(a.placedAt || ""); })
      .slice(0, 5);
    var recentList = document.getElementById("recentBetsList");
    recentList.innerHTML = "";
    if (recentBets.length === 0) {
      recentList.appendChild(el('<p class="empty-state">No bets placed yet.</p>'));
    } else {
      recentBets.forEach(function (b) {
        var m = matchById(b.matchId);
        recentList.appendChild(el(
          '<div class="mini-row"><div><strong>' + b.pick + '</strong>' +
          '<div class="meta">' + (m ? m.teamA + " vs " + m.teamB : "—") + " · stake " + money(b.stake) + '</div></div>' +
          statusBadge(b.status) + "</div>"
        ));
      });
    }
  }

  function renderTournaments() {
    var grid = document.getElementById("tournamentGrid");
    grid.innerHTML = "";
    if (state.tournaments.length === 0) {
      grid.appendChild(el('<p class="empty-state">No tournaments yet. Click "+ Add tournament" to create one.</p>'));
      return;
    }
    state.tournaments
      .slice()
      .sort(function (a, b) { return (a.startDate || "").localeCompare(b.startDate || ""); })
      .forEach(function (t) {
        var matchCount = matchesForTournament(t.id).length;
        var card = el(
          '<div class="t-card">' +
          "<h3>" + t.name + "</h3>" +
          '<div class="org">' + (t.organizer || "Independent organizer") + "</div>" +
          '<div class="row"><span>Dates</span><span>' + fmtDate(t.startDate) + " – " + fmtDate(t.endDate) + '</span></div>' +
          '<div class="row"><span>Prize pool</span><span>' + (t.prizePool ? money(t.prizePool) : "—") + '</span></div>' +
          '<div class="row"><span>Matches</span><span>' + matchCount + '</span></div>' +
          '<div class="foot"><button class="btn btn-ghost btn-small" data-add-match="' + t.id + '">+ Match</button>' +
          '<button class="btn btn-danger btn-small" data-del-tournament="' + t.id + '">Delete</button></div>' +
          "</div>"
        );
        grid.appendChild(card);
      });
  }

  function populateTournamentSelects() {
    var opts = state.tournaments
      .map(function (t) { return '<option value="' + t.id + '">' + t.name + "</option>"; })
      .join("");
    document.getElementById("mTournament").innerHTML = opts || '<option value="">No tournaments — add one first</option>';

    var filter = document.getElementById("matchTournamentFilter");
    var current = filter.value;
    filter.innerHTML = '<option value="">All tournaments</option>' + opts;
    filter.value = current;
  }

  function renderMatches() {
    populateTournamentSelects();

    var tFilter = document.getElementById("matchTournamentFilter").value;
    var sFilter = document.getElementById("matchStatusFilter").value;

    var rows = state.matches.filter(function (m) {
      if (tFilter && m.tournamentId !== tFilter) return false;
      if (sFilter && m.status !== sFilter) return false;
      return true;
    }).sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });

    var tbody = document.querySelector("#matchesTable tbody");
    tbody.innerHTML = "";
    document.getElementById("matchesEmpty").hidden = rows.length !== 0;

    rows.forEach(function (m) {
      var tour = tournamentById(m.tournamentId);
      var score = m.status === "completed" ? (m.scoreA + " – " + m.scoreB) : "—";
      var actionBtn = m.status === "completed"
        ? '<button class="btn btn-ghost btn-small" data-edit-result="' + m.id + '">Edit result</button>'
        : '<button class="btn btn-primary btn-small" data-set-result="' + m.id + '">Set result</button>';

      var teamsHtml = m.teamA + " vs " + m.teamB;
      if (m.status === "completed") {
        teamsHtml = (m.winner === m.teamA ? '<span class="winner-name">' + m.teamA + "</span>" : m.teamA) +
          " vs " +
          (m.winner === m.teamB ? '<span class="winner-name">' + m.teamB + "</span>" : m.teamB);
      }

      tbody.appendChild(el(
        "<tr><td>" + (tour ? tour.name : "—") + "</td>" +
        "<td>" + teamsHtml + "</td>" +
        "<td>" + m.format + "</td>" +
        "<td>" + fmtDate(m.date) + "</td>" +
        "<td>" + statusBadge(m.status) + "</td>" +
        "<td>" + score + "</td>" +
        '<td><div class="row-actions">' + actionBtn +
        '<button class="btn btn-danger btn-small" data-del-match="' + m.id + '">Delete</button></div></td></tr>'
      ));
    });
  }

  function populateBetSelects() {
    var eligible = state.matches.filter(function (m) { return m.status !== "completed"; });
    var betMatch = document.getElementById("betMatch");
    var prev = betMatch.value;
    betMatch.innerHTML = eligible.map(function (m) {
      var tour = tournamentById(m.tournamentId);
      var label = m.teamA + " vs " + m.teamB + (tour ? " (" + tour.name + ")" : "");
      return '<option value="' + m.id + '">' + label + "</option>";
    }).join("");
    if (eligible.some(function (m) { return m.id === prev; })) betMatch.value = prev;

    document.getElementById("betFormEmpty").hidden = eligible.length !== 0;
    document.getElementById("betForm").querySelector("button[type=submit]").disabled = eligible.length === 0;
    updateBetPickOptions();
  }

  function updateBetPickOptions() {
    var mid = document.getElementById("betMatch").value;
    var m = matchById(mid);
    var pick = document.getElementById("betPick");
    if (!m) { pick.innerHTML = ""; return; }
    pick.innerHTML = '<option value="' + m.teamA + '">' + m.teamA + '</option>' +
      '<option value="' + m.teamB + '">' + m.teamB + "</option>";
    updateBetPreview();
  }

  function updateBetPreview() {
    var stake = parseFloat(document.getElementById("betStake").value);
    var odds = parseFloat(document.getElementById("betOdds").value);
    var out = document.getElementById("betPreview");
    if (stake > 0 && odds > 1) {
      var payout = stake * odds;
      out.innerHTML = "Potential payout: <strong>" + money(payout) + "</strong> &nbsp;(profit " + money(payout - stake) + ")";
    } else {
      out.innerHTML = "Potential payout: <strong>—</strong>";
    }
  }

  function renderBets() {
    populateBetSelects();

    var rows = state.bets.slice().sort(function (a, b) { return (b.placedAt || "").localeCompare(a.placedAt || ""); });
    var tbody = document.querySelector("#betsTable tbody");
    tbody.innerHTML = "";
    document.getElementById("betsEmpty").hidden = rows.length !== 0;

    rows.forEach(function (b) {
      var m = matchById(b.matchId);
      var tour = m ? tournamentById(m.tournamentId) : null;
      var payout = b.stake * b.odds;
      var pl = null, plHtml = "—";
      if (b.status === "won") { pl = payout - b.stake; plHtml = '<span class="pl-positive">+' + money(pl).replace("$", "$") + "</span>"; }
      else if (b.status === "lost") { pl = -b.stake; plHtml = '<span class="pl-negative">' + money(pl) + "</span>"; }

      var cancelBtn = b.status === "pending"
        ? '<button class="btn btn-danger btn-small" data-del-bet="' + b.id + '">Cancel</button>'
        : "";

      tbody.appendChild(el(
        "<tr><td>" + (m ? m.teamA + " vs " + m.teamB : "Deleted match") + "</td>" +
        "<td>" + (tour ? tour.name : "—") + "</td>" +
        "<td>" + b.pick + "</td>" +
        "<td>" + money(b.stake) + "</td>" +
        "<td>" + Number(b.odds).toFixed(2) + "</td>" +
        "<td>" + money(payout) + "</td>" +
        "<td>" + statusBadge(b.status) + "</td>" +
        "<td>" + plHtml + "</td>" +
        "<td>" + cancelBtn + "</td></tr>"
      ));
    });
  }

  function renderWinners() {
    var rows = state.matches
      .filter(function (m) { return m.status === "completed"; })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

    var tbody = document.querySelector("#winnersTable tbody");
    tbody.innerHTML = "";
    document.getElementById("winnersEmpty").hidden = rows.length !== 0;

    rows.forEach(function (m) {
      var tour = tournamentById(m.tournamentId);
      var myBets = betsForMatch(m.id);
      var betHtml = "—";
      if (myBets.length > 0) {
        betHtml = myBets.map(function (b) {
          return b.pick + " " + statusBadge(b.status);
        }).join("<br>");
      }
      tbody.appendChild(el(
        "<tr><td>" + fmtDate(m.date) + "</td>" +
        "<td>" + (tour ? tour.name : "—") + "</td>" +
        "<td>" + m.teamA + " vs " + m.teamB + "</td>" +
        "<td>" + m.scoreA + " – " + m.scoreB + "</td>" +
        '<td><span class="winner-name">' + m.winner + "</span></td>" +
        "<td>" + betHtml + "</td></tr>"
      ));
    });
  }

  /* ---------------- tab navigation ---------------- */

  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.tab === name);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("is-active", v.id === "view-" + name);
    });
  }

  /* ---------------- dialogs ---------------- */

  function openDialog(id) { document.getElementById(id).showModal(); }
  function closeDialog(dlg) { dlg.close(); }

  /* ---------------- event wiring ---------------- */

  function wireEvents() {
    document.getElementById("tabs").addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (btn) switchTab(btn.dataset.tab);
    });

    document.querySelectorAll("[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.dataset.goto); });
    });

    document.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () { openDialog(b.dataset.open); });
    });

    document.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeDialog(b.closest("dialog")); });
    });

    // data menu
    var menuBtn = document.getElementById("menuBtn");
    var menu = document.getElementById("dataMenu");
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var willOpen = menu.hidden;
      menu.hidden = !willOpen;
      menuBtn.setAttribute("aria-expanded", String(willOpen));
    });
    document.addEventListener("click", function () { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); });

    menu.addEventListener("click", function (e) {
      var action = e.target.dataset.action;
      if (!action) return;
      if (action === "export") exportData();
      else if (action === "import") document.getElementById("importFile").click();
      else if (action === "seed") {
        if (confirm("Replace current data with sample data?")) { state = sampleState(); saveState(); renderAll(); }
      } else if (action === "reset") {
        if (confirm("Erase all tournaments, matches, and bets? This cannot be undone.")) {
          state = { tournaments: [], matches: [], bets: [] };
          saveState(); renderAll();
        }
      }
    });

    document.getElementById("importFile").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data.tournaments || !data.matches || !data.bets) throw new Error("Missing expected fields");
          state = data;
          saveState();
          renderAll();
          alert("Data imported.");
        } catch (err) {
          alert("Could not import file: " + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    // add tournament
    document.getElementById("formTournament").addEventListener("submit", function () {
      state.tournaments.push({
        id: newId("t"),
        name: document.getElementById("tName").value.trim() || "Untitled tournament",
        organizer: document.getElementById("tOrganizer").value.trim(),
        startDate: document.getElementById("tStart").value,
        endDate: document.getElementById("tEnd").value,
        prizePool: parseFloat(document.getElementById("tPrize").value) || 0
      });
      saveState();
      this.reset();
      renderAll();
    });

    // add match (also triggered by "+ Match" quick action on a tournament card)
    document.getElementById("formMatch").addEventListener("submit", function () {
      var tid = document.getElementById("mTournament").value;
      if (!tid) return;
      state.matches.push({
        id: newId("m"),
        tournamentId: tid,
        teamA: document.getElementById("mTeamA").value.trim() || "Team A",
        teamB: document.getElementById("mTeamB").value.trim() || "Team B",
        format: document.getElementById("mFormat").value,
        date: document.getElementById("mDate").value,
        status: document.getElementById("mStatus").value,
        winner: null, scoreA: null, scoreB: null
      });
      saveState();
      this.reset();
      renderAll();
    });

    // set result
    var resultMatchId = null;
    document.getElementById("formResult").addEventListener("submit", function () {
      var m = matchById(resultMatchId);
      if (!m) return;
      var winner = document.getElementById("rWinner").value;
      var scoreA = parseInt(document.getElementById("rScoreA").value, 10) || 0;
      var scoreB = parseInt(document.getElementById("rScoreB").value, 10) || 0;
      m.status = "completed";
      m.winner = winner;
      m.scoreA = scoreA;
      m.scoreB = scoreB;
      resolveBetsForMatch(m);
      saveState();
      renderAll();
    });

    // event delegation for dynamic buttons across tournament grid / matches table / bets table
    document.body.addEventListener("click", function (e) {
      var addMatch = e.target.closest("[data-add-match]");
      if (addMatch) {
        openDialog("dlgMatch");
        document.getElementById("mTournament").value = addMatch.dataset.addMatch;
        return;
      }
      var delT = e.target.closest("[data-del-tournament]");
      if (delT) {
        if (confirm("Delete this tournament and all its matches and bets?")) {
          var tid = delT.dataset.delTournament;
          var matchIds = matchesForTournament(tid).map(function (m) { return m.id; });
          state.matches = state.matches.filter(function (m) { return m.tournamentId !== tid; });
          state.bets = state.bets.filter(function (b) { return matchIds.indexOf(b.matchId) === -1; });
          state.tournaments = state.tournaments.filter(function (t) { return t.id !== tid; });
          saveState(); renderAll();
        }
        return;
      }
      var delM = e.target.closest("[data-del-match]");
      if (delM) {
        if (confirm("Delete this match and any bets on it?")) {
          var mid = delM.dataset.delMatch;
          state.bets = state.bets.filter(function (b) { return b.matchId !== mid; });
          state.matches = state.matches.filter(function (m) { return m.id !== mid; });
          saveState(); renderAll();
        }
        return;
      }
      var setRes = e.target.closest("[data-set-result], [data-edit-result]");
      if (setRes) {
        var id = setRes.dataset.setResult || setRes.dataset.editResult;
        var match = matchById(id);
        if (!match) return;
        resultMatchId = id;
        document.getElementById("resultMatchLabel").textContent = match.teamA + " vs " + match.teamB;
        document.getElementById("rWinner").innerHTML =
          '<option value="' + match.teamA + '">' + match.teamA + '</option>' +
          '<option value="' + match.teamB + '">' + match.teamB + "</option>";
        document.getElementById("rScoreALabel").firstChild.textContent = match.teamA + " score ";
        document.getElementById("rScoreBLabel").firstChild.textContent = match.teamB + " score ";
        if (match.winner) document.getElementById("rWinner").value = match.winner;
        document.getElementById("rScoreA").value = match.scoreA != null ? match.scoreA : "";
        document.getElementById("rScoreB").value = match.scoreB != null ? match.scoreB : "";
        openDialog("dlgResult");
        return;
      }
      var delBet = e.target.closest("[data-del-bet]");
      if (delBet) {
        state.bets = state.bets.filter(function (b) { return b.id !== delBet.dataset.delBet; });
        saveState(); renderAll();
        return;
      }
    });

    // filters
    document.getElementById("matchTournamentFilter").addEventListener("change", renderMatches);
    document.getElementById("matchStatusFilter").addEventListener("change", renderMatches);

    // bet form live preview
    document.getElementById("betMatch").addEventListener("change", updateBetPickOptions);
    document.getElementById("betStake").addEventListener("input", updateBetPreview);
    document.getElementById("betOdds").addEventListener("input", updateBetPreview);

    document.getElementById("betForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var mid = document.getElementById("betMatch").value;
      var pick = document.getElementById("betPick").value;
      var stake = parseFloat(document.getElementById("betStake").value);
      var odds = parseFloat(document.getElementById("betOdds").value);
      if (!mid || !pick || !(stake > 0) || !(odds > 1)) return;
      state.bets.push({
        id: newId("b"),
        matchId: mid,
        pick: pick,
        stake: stake,
        odds: odds,
        status: "pending",
        placedAt: new Date().toISOString().slice(0, 10)
      });
      saveState();
      this.reset();
      renderAll();
    });
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "cs2-tracker-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------------- boot ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    init();
    wireEvents();
    renderAll();
  });
})();
