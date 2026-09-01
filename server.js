const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Twój klucz API
const API_KEY = '9161948d0b9c47a0bce359f18ed2bc49'; 
const CHAMPIONS_LEAGUE_ID = 'CL';

const db = new sqlite3.Database('./baza.db');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'tajny-klucz-typera-lm',
    resave: false,
    saveUninitialized: false
}));

// Inicjalizacja Bazy Danych
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        top_scorer TEXT,
        winner TEXT,
        points INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        bonus_awarded INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_match_id INTEGER UNIQUE,
        home_team TEXT,
        away_team TEXT,
        match_date DATETIME,
        home_score INTEGER DEFAULT NULL,
        away_score INTEGER DEFAULT NULL,
        is_finished INTEGER DEFAULT 0,
        stage TEXT DEFAULT 'LEAGUE',
        pair_id INTEGER DEFAULT NULL,
        leg INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        match_id INTEGER,
        pred_home INTEGER,
        pred_away INTEGER,
        UNIQUE(user_id, match_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(match_id) REFERENCES matches(id)
    )`);

    db.get("SELECT COUNT(*) AS count FROM matches", (err, row) => {
        if (row && row.count === 0) {
            const allLeagueMatches = [
                // KOLEJKA 1
                ['AEK', 'LASK', '2026-09-08 18:45'],
                ['Club Brugge', 'Aston Villa', '2026-09-08 18:45'],
                ['Borussia Dortmund', 'Villarreal', '2026-09-08 21:00'],
                ['FC Porto', 'Manchester City', '2026-09-08 21:00'],
                ['Lille', 'Betis', '2026-09-08 21:00'],
                ['Real Madryt', 'Inter', '2026-09-08 21:00'],
                ['Barcelona', 'Feyenoord', '2026-09-09 18:45'],
                ['VfB Stuttgart', 'Viking', '2026-09-09 18:45'],
                ['Liverpool', 'Atl. Madryt', '2026-09-09 21:00'],
                ['Napoli', 'Arsenal', '2026-09-09 21:00'],
                ['PSG', 'Slovan Bratysława', '2026-09-09 21:00'],
                ['Sporting', 'Galatasaray', '2026-09-09 21:00'],
                ['Fenerbahce', 'AS Roma', '2026-09-10 18:45'],
                ['PSV', 'Szachtar Donieck', '2026-09-10 18:45'],
                ['Bayern Monachium', 'Bodo/Glimt', '2026-09-10 21:00'],
                ['Como', 'RB Lipsk', '2026-09-10 21:00'],
                ['Manchester Utd', 'Sabah Baku', '2026-09-10 21:00'],
                ['Slavia Praga', 'Lens', '2026-09-10 21:00'],

                // KOLEJKA 2
                ['Lens', 'Sporting', '2026-10-13 18:45'],
                ['Sabah Baku', 'Slavia Praga', '2026-10-13 18:45'],
                ['Arsenal', 'Lille', '2026-10-13 21:00'],
                ['Atl. Madryt', 'Manchester Utd', '2026-10-13 21:00'],
                ['Galatasaray', 'Barcelona', '2026-10-13 21:00'],
                ['Inter', 'Club Brugge', '2026-10-13 21:00'],
                ['RB Lipsk', 'PSV', '2026-10-13 21:00'],
                ['Viking', 'Bayern Monachium', '2026-10-13 21:00'],
                ['Villarreal', 'Napoli', '2026-10-13 21:00'],
                ['Feyenoord', 'Como', '2026-10-14 18:45'],
                ['LASK', 'Liverpool', '2026-10-14 18:45'],
                ['AS Roma', 'Real Madryt', '2026-10-14 21:00'],
                ['Aston Villa', 'Fenerbahce', '2026-10-14 21:00'],
                ['Betis', 'FC Porto', '2026-10-14 21:00'],
                ['Bodo/Glimt', 'Borussia Dortmund', '2026-10-14 21:00'],
                ['Manchester City', 'PSG', '2026-10-14 21:00'],
                ['Slovan Bratysława', 'VfB Stuttgart', '2026-10-14 21:00'],
                ['Szachtar Donieck', 'AEK', '2026-10-14 21:00'],

                // KOLEJKA 3
                ['Fenerbahce', 'Slavia Praga', '2026-10-20 18:45'],
                ['Sabah Baku', 'Borussia Dortmund', '2026-10-20 18:45'],
                ['AS Roma', 'Slovan Bratysława', '2026-10-20 21:00'],
                ['FC Porto', 'PSV', '2026-10-20 21:00'],
                ['Liverpool', 'Villarreal', '2026-10-20 21:00'],
                ['Manchester City', 'AEK', '2026-10-20 21:00'],
                ['Napoli', 'Bodo/Glimt', '2026-10-20 21:00'],
                ['PSG', 'Barcelona', '2026-10-20 21:00'],
                ['VfB Stuttgart', 'Atl. Madryt', '2026-10-20 21:00'],
                ['Como', 'Manchester Utd', '2026-10-21 18:45'],
                ['Lille', 'Galatasaray', '2026-10-21 18:45'],
                ['Aston Villa', 'Viking', '2026-10-21 21:00'],
                ['Bayern Monachium', 'Arsenal', '2026-10-21 21:00'],
                ['Betis', 'Feyenoord', '2026-10-21 21:00'],
                ['Club Brugge', 'Lens', '2026-10-21 21:00'],
                ['Inter', 'Szachtar Donieck', '2026-10-21 21:00'],
                ['Real Madryt', 'RB Lipsk', '2026-10-21 21:00'],
                ['Sporting', 'LASK', '2026-10-21 21:00'],

                // KOLEJKA 4
                ['Galatasaray', 'VfB Stuttgart', '2026-11-03 18:45'],
                ['Szachtar Donieck', 'Sporting', '2026-11-03 18:45'],
                ['Atl. Madryt', 'Bayern Monachium', '2026-11-03 21:00'],
                ['Barcelona', 'Aston Villa', '2026-11-03 21:00'],
                ['Bodo/Glimt', 'Lille', '2026-11-03 21:00'],
                ['Feyenoord', 'Inter', '2026-11-03 21:00'],
                ['LASK', 'Slovan Bratysława', '2026-11-03 21:00'],
                ['Manchester Utd', 'AS Roma', '2026-11-03 21:00'],
                ['Villarreal', 'PSG', '2026-11-03 21:00'],
                ['AEK', 'Real Madryt', '2026-11-04 18:45'],
                ['Fenerbahce', 'Liverpool', '2026-11-04 18:45'],
                ['Borussia Dortmund', 'Betis', '2026-11-04 21:00'],
                ['FC Porto', 'Napoli', '2026-11-04 21:00'],
                ['Lens', 'Como', '2026-11-04 21:00'],
                ['PSV', 'Club Brugge', '2026-11-04 21:00'],
                ['RB Lipsk', 'Manchester City', '2026-11-04 21:00'],
                ['Slavia Praga', 'Arsenal', '2026-11-04 21:00'],
                ['Viking', 'Sabah Baku', '2026-11-04 21:00'],

                // KOLEJKA 5
                ['Bodo/Glimt', 'LASK', '2026-11-24 18:45'],
                ['Galatasaray', 'Aston Villa', '2026-11-24 18:45'],
                ['Arsenal', 'Borussia Dortmund', '2026-11-24 21:00'],
                ['Como', 'AEK', '2026-11-24 21:00'],
                ['Feyenoord', 'FC Porto', '2026-11-24 21:00'],
                ['Manchester City', 'Napoli', '2026-11-24 21:00'],
                ['RB Lipsk', 'Lens', '2026-11-24 21:00'],
                ['Real Madryt', 'PSV', '2026-11-24 21:00'],
                ['Slovan Bratysława', 'Betis', '2026-11-24 21:00'],
                ['Sabah Baku', 'Barcelona', '2026-11-25 18:45'],
                ['Slavia Praga', 'Villarreal', '2026-11-25 18:45'],
                ['Atl. Madryt', 'Viking', '2026-11-25 21:00'],
                ['Club Brugge', 'Liverpool', '2026-11-25 21:00'],
                ['Inter', 'VfB Stuttgart', '2026-11-25 21:00'],
                ['Lille', 'Bayern Monachium', '2026-11-25 21:00'],
                ['PSG', 'AS Roma', '2026-11-25 21:00'],
                ['Sporting', 'Manchester Utd', '2026-11-25 21:00'],
                ['Szachtar Donieck', 'Fenerbahce', '2026-11-25 21:00'],

                // KOLEJKA 6
                ['Viking', 'Feyenoord', '2026-12-08 18:45'],
                ['Villarreal', 'Sabah Baku', '2026-12-08 18:45'],
                ['AEK', 'Galatasaray', '2026-12-08 21:00'],
                ['AS Roma', 'Sporting', '2026-12-08 21:00'],
                ['Aston Villa', 'PSG', '2026-12-08 21:00'],
                ['Barcelona', 'Manchester City', '2026-12-08 21:00'],
                ['Bayern Monachium', 'Slavia Praga', '2026-12-08 21:00'],
                ['Manchester Utd', 'RB Lipsk', '2026-12-08 21:00'],
                ['Napoli', 'Club Brugge', '2026-12-08 21:00'],
                ['Betis', 'Como', '2026-12-09 18:45'],
                ['Slovan Bratysława', 'Szachtar Donieck', '2026-12-09 18:45'],
                ['Arsenal', 'Real Madryt', '2026-12-09 21:00'],
                ['Borussia Dortmund', 'Inter', '2026-12-09 21:00'],
                ['LASK', 'Fenerbahce', '2026-12-09 21:00'],
                ['Lens', 'Bodo/Glimt', '2026-12-09 21:00'],
                ['Liverpool', 'FC Porto', '2026-12-09 21:00'],
                ['PSV', 'Atl. Madryt', '2026-12-09 21:00'],
                ['VfB Stuttgart', 'Lille', '2026-12-09 21:00'],

                // KOLEJKA 7
                ['Bodo/Glimt', 'Atl. Madryt', '2027-01-19 21:00'],
                ['Galatasaray', 'Feyenoord', '2027-01-19 21:00'],
                ['AEK', 'AS Roma', '2027-01-19 21:00'],
                ['Aston Villa', 'Borussia Dortmund', '2027-01-19 21:00'],
                ['FC Porto', 'Slavia Praga', '2027-01-19 21:00'],
                ['Inter', 'Liverpool', '2027-01-19 21:00'],
                ['Lille', 'Slovan Bratysława', '2027-01-19 21:00'],
                ['Real Madryt', 'LASK', '2027-01-19 21:00'],
                ['VfB Stuttgart', 'Club Brugge', '2027-01-19 21:00'],
                ['Fenerbahce', 'Villarreal', '2027-01-20 21:00'],
                ['Sabah Baku', 'Napoli', '2027-01-20 21:00'],
                ['Betis', 'Arsenal', '2027-01-20 21:00'],
                ['Como', 'PSG', '2027-01-20 21:00'],
                ['Lens', 'Manchester City', '2027-01-20 21:00'],
                ['Manchester Utd', 'Bayern Monachium', '2027-01-20 21:00'],
                ['RB Lipsk', 'Szachtar Donieck', '2027-01-20 21:00'],
                ['Sporting', 'Barcelona', '2027-01-20 21:00'],
                ['Viking', 'PSV', '2027-01-20 21:00'],

                // KOLEJKA 8
                ['Arsenal', 'Sabah Baku', '2027-01-27 21:00'],
                ['AS Roma', 'Lille', '2027-01-27 21:00'],
                ['Atl. Madryt', 'Fenerbahce', '2027-01-27 21:00'],
                ['Barcelona', 'Como', '2027-01-27 21:00'],
                ['Bayern Monachium', 'Betis', '2027-01-27 21:00'],
                ['Borussia Dortmund', 'AEK', '2027-01-27 21:00'],
                ['Club Brugge', 'Bodo/Glimt', '2027-01-27 21:00'],
                ['Feyenoord', 'RB Lipsk', '2027-01-27 21:00'],
                ['LASK', 'FC Porto', '2027-01-27 21:00'],
                ['Liverpool', 'Lens', '2027-01-27 21:00'],
                ['Manchester City', 'Sporting', '2027-01-27 21:00'],
                ['Napoli', 'Viking', '2027-01-27 21:00'],
                ['PSG', 'Galatasaray', '2027-01-27 21:00'],
                ['PSV', 'VfB Stuttgart', '2027-01-27 21:00'],
                ['Slavia Praga', 'Aston Villa', '2027-01-27 21:00'],
                ['Slovan Bratysława', 'Inter', '2027-01-27 21:00'],
                ['Szachtar Donieck', 'Real Madryt', '2027-01-27 21:00'],
                ['Villarreal', 'Manchester Utd', '2027-01-27 21:00']
            ];

            const stmt = db.prepare("INSERT INTO matches (home_team, away_team, match_date, stage) VALUES (?, ?, ?, 'LEAGUE')");
            allLeagueMatches.forEach(m => stmt.run(m));
            stmt.finalize();

            const knockoutsTemplate = [
                { stage: 'PLAYOFF_16', count: 8, dates: ['2027-02-16 21:00', '2027-02-17 21:00', '2027-02-23 21:00', '2027-02-24 21:00'] },
                { stage: 'R16', count: 8, dates: ['2027-03-09 21:00', '2027-03-10 21:00', '2027-03-16 21:00', '2027-03-17 21:00'] },
                { stage: 'QF', count: 4, dates: ['2027-04-06 21:00', '2027-04-07 21:00', '2027-04-13 21:00', '2027-04-14 21:00'] },
                { stage: 'SF', count: 2, dates: ['2027-04-27 21:00', '2027-04-28 21:00', '2027-05-04 21:00', '2027-05-05 21:00'] },
            ];

            const stmtK = db.prepare("INSERT INTO matches (home_team, away_team, match_date, stage, pair_id, leg) VALUES (?, ?, ?, ?, ?, ?)");
            knockoutsTemplate.forEach(kt => {
                for (let p = 1; p <= kt.count; p++) {
                    const d1 = kt.dates[(p - 1) % 2];
                    const d2 = kt.dates[2 + ((p - 1) % 2)];
                    stmtK.run('Do ustalenia', 'Do ustalenia', d1, kt.stage, p, 1);
                    stmtK.run('Do ustalenia', 'Do ustalenia', d2, kt.stage, p, 2);
                }
            });

            stmtK.run('Do ustalenia', 'Do ustalenia', '2027-06-05 21:00', 'FINAL', 1, 1);
            stmtK.finalize();
        }
    });
});

// AUTOMATYCZNY BOT (CO 1 MINUTĘ)
cron.schedule('* * * * *', () => {
    fetchLiveResultsAndSettle();
});

async function fetchLiveResultsAndSettle() {
    if (!API_KEY) return;
    try {
        const response = await axios.get(`https://api.football-data.org/v4/competitions/${CHAMPIONS_LEAGUE_ID}/matches`, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        const matchesFromApi = response.data.matches;

        matchesFromApi.forEach(apiMatch => {
            if (apiMatch.status === 'FINISHED') {
                const homeScore = apiMatch.score.fullTime.home;
                const awayScore = apiMatch.score.fullTime.away;
                const homeTeam = apiMatch.homeTeam.name;
                const awayTeam = apiMatch.awayTeam.name;

                db.get(`SELECT * FROM matches WHERE (api_match_id = ? OR (home_team LIKE ? AND away_team LIKE ?)) AND is_finished = 0`,
                    [apiMatch.id, `%${homeTeam}%`, `%${awayTeam}%`], (err, match) => {

                    if (match) {
                        settleMatch(match.id, homeScore, awayScore);
                    }
                });
            }
        });
    } catch (error) {
        console.error('[BOT ERROR]', error.message);
    }
}

function settleMatch(matchId, homeScore, awayScore) {
    db.run(`UPDATE matches SET home_score = ?, away_score = ?, is_finished = 1 WHERE id = ?`, 
        [homeScore, awayScore, matchId], () => {
            
            db.all(`SELECT * FROM bets WHERE match_id = ?`, [matchId], (err, bets) => {
                if (bets) {
                    bets.forEach(bet => {
                        let pts = 0;
                        const realH = parseInt(homeScore);
                        const realA = parseInt(awayScore);
                        const predH = parseInt(bet.pred_home);
                        const predA = parseInt(bet.pred_away);

                        if (realH === predH && realA === predA) pts = 3;
                        else if ((realH > realA && predH > predA) || 
                                 (realH < realA && predH < predA) || 
                                 (realH === realA && predH === predA)) pts = 1;

                        if (pts > 0) {
                            db.run(`UPDATE users SET points = points + ? WHERE id = ?`, [pts, bet.user_id]);
                        }
                    });
                }
                checkAndAdvanceKnockout();
                checkFinalBonus();
            });
    });
}

function getLeagueTable(callback) {
    db.all("SELECT * FROM matches WHERE stage = 'LEAGUE'", [], (err, matches) => {
        const stats = {};
        matches.forEach(m => {
            if (!stats[m.home_team]) stats[m.home_team] = { name: m.home_team, pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };
            if (!stats[m.away_team]) stats[m.away_team] = { name: m.away_team, pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };

            if (m.is_finished) {
                stats[m.home_team].played++;
                stats[m.away_team].played++;
                stats[m.home_team].gf += m.home_score;
                stats[m.home_team].ga += m.away_score;
                stats[m.away_team].gf += m.away_score;
                stats[m.away_team].ga += m.home_score;

                if (m.home_score > m.away_score) stats[m.home_team].pts += 3;
                else if (m.home_score < m.away_score) stats[m.away_team].pts += 3;
                else {
                    stats[m.home_team].pts += 1;
                    stats[m.away_team].pts += 1;
                }
            }
        });

        const table = Object.values(stats).map(s => {
            s.gd = s.gf - s.ga;
            return s;
        });

        table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
        callback(table);
    });
}

function checkAndAdvanceKnockout() {
    db.get("SELECT COUNT(*) as unfinished FROM matches WHERE stage = 'LEAGUE' AND is_finished = 0", [], (err, row) => {
        if (row && row.unfinished === 0) {
            getLeagueTable((table) => {
                const playoffPairs = [
                    [table[8].name, table[23].name],
                    [table[9].name, table[22].name],
                    [table[10].name, table[21].name],
                    [table[11].name, table[20].name],
                    [table[12].name, table[19].name],
                    [table[13].name, table[18].name],
                    [table[14].name, table[17].name],
                    [table[15].name, table[16].name]
                ];

                playoffPairs.forEach((pair, idx) => {
                    const pairId = idx + 1;
                    db.run(`UPDATE matches SET home_team = ?, away_team = ? WHERE stage = 'PLAYOFF_16' AND pair_id = ? AND leg = 1`, [pair[1], pair[0], pairId]);
                    db.run(`UPDATE matches SET home_team = ?, away_team = ? WHERE stage = 'PLAYOFF_16' AND pair_id = ? AND leg = 2`, [pair[0], pair[1], pairId]);
                });
            });
        }
    });

    const stagesOrder = [
        { current: 'PLAYOFF_16', next: 'R16' },
        { current: 'R16', next: 'QF' },
        { current: 'QF', next: 'SF' },
        { current: 'SF', next: 'FINAL' }
    ];

    stagesOrder.forEach(st => {
        db.get(`SELECT COUNT(*) as unfinished FROM matches WHERE stage = ? AND is_finished = 0`, [st.current], (err, row) => {
            if (row && row.unfinished === 0) advanceStage(st.current, st.next);
        });
    });
}

function advanceStage(currentStage, nextStage) {
    db.all(`SELECT * FROM matches WHERE stage = ? ORDER BY pair_id ASC, leg ASC`, [currentStage], (err, matches) => {
        if (!matches || matches.length === 0) return;

        if (currentStage === 'PLAYOFF_16') {
            getLeagueTable((table) => {
                const top8 = table.slice(0, 8).map(t => t.name);
                const playoffWinners = getWinnersFromLegs(matches);
                const all16 = [...top8, ...playoffWinners];
                fillNextRoundMatches(all16, nextStage);
            });
        } else {
            const winners = getWinnersFromLegs(matches);
            fillNextRoundMatches(winners, nextStage);
        }
    });
}

function getWinnersFromLegs(matches) {
    const pairs = {};
    matches.forEach(m => {
        if (!pairs[m.pair_id]) pairs[m.pair_id] = [];
        pairs[m.pair_id].push(m);
    });

    const winners = [];
    Object.keys(pairs).forEach(pId => {
        const pairMatches = pairs[pId];
        if (pairMatches.length === 1 && pairMatches[0].stage === 'FINAL') {
            const m = pairMatches[0];
            winners.push(m.home_score > m.away_score ? m.home_team : m.away_team);
        } else if (pairMatches.length === 2) {
            const m1 = pairMatches[0];
            const m2 = pairMatches[1];
            const scoreA = m1.home_score + m2.away_score;
            const scoreB = m1.away_score + m2.home_score;
            if (scoreA > scoreB) winners.push(m1.home_team);
            else winners.push(m1.away_team);
        }
    });
    return winners;
}

function fillNextRoundMatches(teams, nextStage) {
    if (nextStage === 'FINAL') {
        db.run(`UPDATE matches SET home_team = ?, away_team = ? WHERE stage = 'FINAL' AND pair_id = 1`, [teams[0], teams[1]]);
    } else {
        let pairCounter = 1;
        for (let i = 0; i < teams.length; i += 2) {
            db.run(`UPDATE matches SET home_team = ?, away_team = ? WHERE stage = ? AND pair_id = ? AND leg = 1`, [teams[i], teams[i + 1], nextStage, pairCounter]);
            db.run(`UPDATE matches SET home_team = ?, away_team = ? WHERE stage = ? AND pair_id = ? AND leg = 2`, [teams[i + 1], teams[i], nextStage, pairCounter]);
            pairCounter++;
        }
    }
}

// AUTOMATYCZNE ROZLICZANIE 10 PKT ZA KRÓLA STRZELCÓW I ZWYCIĘZCĘ PO FINALE
async function checkFinalBonus() {
    db.get("SELECT * FROM matches WHERE stage = 'FINAL' AND is_finished = 1", [], async (err, finalMatch) => {
        if (!finalMatch) return;

        const tournamentWinner = finalMatch.home_score > finalMatch.away_score ? finalMatch.home_team : finalMatch.away_team;

        try {
            const response = await axios.get(`https://api.football-data.org/v4/competitions/${CHAMPIONS_LEAGUE_ID}/scorers`, {
                headers: { 'X-Auth-Token': API_KEY }
            });
            const topScorerApi = response.data.scorers[0]?.player?.name;

            db.all("SELECT * FROM users WHERE bonus_awarded = 0", [], (err, users) => {
                if (!users) return;

                users.forEach(user => {
                    let bonusPts = 0;

                    if (user.winner && user.winner.toLowerCase().trim() === tournamentWinner.toLowerCase().trim()) {
                        bonusPts += 10;
                    }

                    if (topScorerApi && user.top_scorer && user.top_scorer.toLowerCase().trim() === topScorerApi.toLowerCase().trim()) {
                        bonusPts += 10;
                    }

                    if (bonusPts > 0) {
                        db.run("UPDATE users SET points = points + ?, bonus_awarded = 1 WHERE id = ?", [bonusPts, user.id]);
                    } else {
                        db.run("UPDATE users SET bonus_awarded = 1 WHERE id = ?", [user.id]);
                    }
                });
            });
        } catch (e) {
            console.error('[BONUS ERROR]', e.message);
        }
    });
}

// LOGOWANIE I REJESTRACJA
app.get('/', (req, res) => {
    if (req.session.userId) res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    else res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.get("SELECT COUNT(*) as userCount FROM users", [], (err, row) => {
            const isAdmin = row.userCount === 0 ? 1 : 0;
            db.run(`INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)`, [username, hashedPassword, isAdmin], function(err) {
                if (err) return res.send('Użytkownik istnieje! <a href="/">Wróć</a>');
                req.session.userId = this.lastID;
                req.session.username = username;
                req.session.isAdmin = isAdmin;
                res.redirect('/');
            });
        });
    } catch (e) {
        res.send('Błąd rejestracji. <a href="/">Wróć</a>');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('Błędne dane! <a href="/">Wróć</a>');
        }
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.is_admin;
        res.redirect('/');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.post('/submit-bet', (req, res) => {
    const { match_id, home_score, away_score } = req.body;
    db.get(`SELECT match_date FROM matches WHERE id = ?`, [match_id], (err, match) => {
        if (!match) return res.status(404).send('Nie znaleziono meczu');

        if (new Date() >= new Date(match.match_date)) {
            return res.send('Mecz już się rozpoczął! Nie można zmienić typu. <a href="/">Wróć</a>');
        }

        db.run(`INSERT INTO bets (user_id, match_id, pred_home, pred_away) 
                VALUES (?, ?, ?, ?) 
                ON CONFLICT(user_id, match_id) 
                DO UPDATE SET pred_home=excluded.pred_home, pred_away=excluded.pred_away`,
            [req.session.userId, match_id, home_score, away_score], () => res.redirect('/'));
    });
});

// ZAPISYWANIE KRÓLA STRZELCÓW I MISTRZA (Z BLOKADĄ PO STARTU PIERWSZEGO MECZU)
app.post('/submit-outright', (req, res) => {
    const { winner, top_scorer } = req.body;

    db.get("SELECT MIN(match_date) as first_match FROM matches", [], (err, row) => {
        if (row && row.first_match && new Date() >= new Date(row.first_match)) {
            return res.send('Pierwszy mecz Ligi Mistrzów już się rozpoczął! Typowanie zostało zablokowane. <a href="/">Wróć</a>');
        }

        db.run("UPDATE users SET winner = ?, top_scorer = ? WHERE id = ?", [winner, top_scorer, req.session.userId], () => {
            res.redirect('/');
        });
    });
});

app.get('/api/data', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Niezalogowany' });

    db.all(`SELECT * FROM matches ORDER BY match_date ASC`, [], (err, matches) => {
        db.all(`SELECT * FROM bets WHERE user_id = ?`, [req.session.userId], (err, myBets) => {
            db.all(`SELECT id, username, points, top_scorer, winner, is_admin FROM users ORDER BY points DESC`, [], (err, users) => {
                db.all(`SELECT bets.user_id, bets.match_id, bets.pred_home, bets.pred_away 
                        FROM bets 
                        JOIN matches ON bets.match_id = matches.id 
                        WHERE matches.is_finished = 1`, [], (err, revealedBets) => {

                    getLeagueTable((leagueTable) => {
                        res.json({
                            username: req.session.username,
                            isAdmin: req.session.isAdmin === 1,
                            matches,
                            myBets,
                            users,
                            revealedBets,
                            leagueTable
                        });
                    });
                });
            });
        });
    });
});

app.listen(PORT, () => console.log(`Serwer typera działa na porcie ${PORT}`));