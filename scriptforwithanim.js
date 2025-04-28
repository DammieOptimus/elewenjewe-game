// ==========================================================================
// Elewenjewe Game Script
// Version: Corrected AI Hard Evaluation Loop + Setup + All Features
// ==========================================================================

// --- 1. DOM Element References ---
const setupModal = document.getElementById('setup-modal');
const setupForm = document.getElementById('setup-form');
const numPlayersSelect = document.getElementById('num-players');
const playerConfigArea = document.getElementById('player-config-area');
const startGameBtn = document.getElementById('start-game-btn');
const gameModeSelect = document.getElementById('game-mode');
const rulesetSelect = document.getElementById('ruleset');
const allowEsunCheckbox = document.getElementById('allow-esun');
const allowIsiwoCheckbox = document.getElementById('allow-isiwo');
const gameLengthInput = document.getElementById('game-length');
const gameContainer = document.getElementById('game-container');
const opponentAreaContainer = document.getElementById('opponent-area-container');
const playerAreaContainer = document.getElementById('player-area-container');
const tablePaletteElement = document.getElementById('table-palette');
const deckCountElement = document.getElementById('deck-count');
const currentPlayerElement = document.getElementById('current-player');
const roundInfoElement = document.getElementById('round-info');
const gameLogElement = document.getElementById('game-log');
const playCardBtn = document.getElementById('play-card-btn');
const skipScoopBtn = document.getElementById('skip-scoop-btn');
const confirmScoopBtn = document.getElementById('confirm-scoop-btn');
const scoopActionsDiv = document.getElementById('scoop-actions-div');
let player1HandElement = null; // Ref to primary human hand div
let viewScoopedBtn = null; // Ref to primary human Isiwo button
const buildEsunBtn = document.getElementById('build-esun-btn');
const esunBuildActionsDiv = document.getElementById('esun-build-actions-div');
const confirmEsunBuildBtn = document.getElementById('confirm-esun-build-btn');
const cancelEsunBuildBtn = document.getElementById('cancel-esun-build-btn');
const isiwoModal = document.getElementById('isiwo-modal');
const isiwoCardsDisplay = document.getElementById('isiwo-cards-display');
const isiwoCloseBtn = document.getElementById('isiwo-close-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoresDiv = document.getElementById('final-scores');
const winnerAnnouncement = document.getElementById('winner-announcement');
const playAgainBtn = document.getElementById('play-again-btn');
const deckVisualArea = document.getElementById('deck-visual-area');

// --- 2. Game Constants & Configuration ---
const SUITS = ["♦", "♣", "♥", "♠"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const STARTING_TABLE_CARDS = ['K♦', 'Q♦', 'J♦', '9♦'];
const CARD_VALUES = { "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 0, "Q": 0, "K": 0, "JOKER": 0 };
const DEFAULT_AI_LEVEL = 'Easy';
let gameSettings = {};

// --- 3. Game State Variables ---
let deck = [];
let players = [];
let tableCards = [];
let esunPiles = [];
let currentPlayerIndex = 0;
let currentRound = 1;
let selectedPlayerCard = null;
let lastPlayerToScoop = -1;
let gameState = 'Setup';
let currentTurnData = { playedCard: null, potentialScoops: [], selectedScoop: null };
let esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null };
let nextEsunPileId = 1;

// --- 4. Core Game Logic & Animation Utils ---

function createDeck() { const d = []; for (const s of SUITS) for (const r of RANKS) d.push({ id: r + s, rank: r, suit: s, value: CARD_VALUES[r], display: r + s, isJoker: false }); if ("Amateur" === gameSettings.gameMode) { d.push({ id: "JOKER1", rank: "JOKER", suit: "", value: 0, display: "Joker", isJoker: true }); d.push({ id: "JOKER2", rank: "JOKER", suit: "", value: 0, display: "Joker", isJoker: true }); } return d }
function shuffleDeck(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } }
function removeSpecificCards(deckRef, cardsToRemove) { const r = [], d = [], s = new Set(cardsToRemove); for (const c of deckRef) { s.has(c.id) ? r.push(c) : d.push(c); } deckRef.length = 0; deckRef.push(...d); if (r.length !== cardsToRemove.length) console.error("Cannot find starting cards!", cardsToRemove, r); return cardsToRemove.map(id => r.find(c => c.id === id)).filter(Boolean); }
function dealCards(numCards) { let d = 0; for (let i = 0; i < numCards; i++) { for (const p of players) { if (deck.length > 0) { p.hand.push(deck.pop()); d++; } else { if (d > 0 || i === 0) logMessage("Deck empty."); return; } } } }
function findSumSubsets(targetValue, availableCards) { const r = [], n = availableCards.filter(c => c.value > 0 && !c.isJoker); function f(i, s, u) { if (s === targetValue) r.push([...u]); if (i >= n.length || s > targetValue) return; u.push(n[i]); f(i + 1, s + n[i].value, u); u.pop(); f(i + 1, s, u); } if (targetValue > 0 && n.length > 0) f(0, 0, []); return r.filter(s => s.length > 0); }
function checkForScoops(playedCard, currentTableCards, currentEsunPiles) { const nJTC = currentTableCards.filter(c => !c.isJoker); if (playedCard.isJoker) return []; let pS = []; const rM = nJTC.filter(c => c.rank === playedCard.rank); rM.forEach(m => pS.push({ type: 'rank', cardsToScoop: [m] })); if (playedCard.value > 0) { findSumSubsets(playedCard.value, nJTC).forEach(s => pS.push({ type: 'sum', cardsToScoop: s })) } if (gameSettings.allowEsun) { currentEsunPiles.forEach(p => { if (playedCard.rank === p.captureCardRank) pS.push({ type: 'esun', pile: p }) }) } if (gameSettings.ruleset === 'Yorùbá') { pS = pS.filter(s => { if (s.type === 'esun') return true; const c = [playedCard, ...s.cardsToScoop].filter(c => !c.isJoker), r = c.map(c => c.rank), u = new Set(r); return r.length === u.size }) } const cCE = pS.some(s => s.type === 'esun'); if (cCE) { pS = pS.filter(s => s.type === 'esun') } return pS }
function executeScoop(player, playedCard, scoopData) { logMessage(`${player.name} scoops ${scoopData.cardsToScoop.map(c => c.display).join(', ')} w/ ${playedCard.display}`); player.scoopedPile.push(playedCard, ...scoopData.cardsToScoop); const ids = new Set(scoopData.cardsToScoop.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id)); lastPlayerToScoop = players.findIndex(p => p.id === player.id) }
function getElementCoords(element) { if (!element) { console.warn("getElementCoords called with null element"); return { top: 0, left: 0, width: 0, height: 0 }; } const rect = element.getBoundingClientRect(); return { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height }; }
function animateCardMove(cardElement, startCoords, endCoords, duration = 500, onComplete) { if (!cardElement) { console.warn("animateCardMove: cardElement is null"); if (onComplete) onComplete(); return; } cardElement.style.position = 'absolute'; cardElement.style.left = `${startCoords.left}px`; cardElement.style.top = `${startCoords.top}px`; cardElement.style.transform = ''; cardElement.style.opacity = '1'; cardElement.classList.add('card-is-animating'); document.body.appendChild(cardElement); void cardElement.offsetWidth; const deltaX = endCoords.left - startCoords.left; const deltaY = endCoords.top - startCoords.top; cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`; setTimeout(() => { cardElement.remove(); if (onComplete) { onComplete(); } }, duration); }
function animateScoop(cardElement, targetElement, duration = 600, onComplete) { if (!cardElement || !targetElement) { console.warn("animateScoop: null element provided"); if (onComplete) onComplete(); return; } const startCoords = getElementCoords(cardElement); const targetCoords = getElementCoords(targetElement); const endCoords = { left: targetCoords.left + (targetCoords.width / 2) - (startCoords.width / 2), top: targetCoords.top - 10 }; const clone = cardElement.cloneNode(true); clone.style.position = 'absolute'; clone.style.left = `${startCoords.left}px`; clone.style.top = `${startCoords.top}px`; clone.style.zIndex = '1002'; clone.style.transition = `transform ${duration / 1000 * 0.9}s ease-in, opacity ${duration / 1000 * 0.8}s ease-in ${duration / 1000 * 0.2}s`; document.body.appendChild(clone); cardElement.style.opacity = '0'; cardElement.style.visibility = 'hidden'; void clone.offsetWidth; const deltaX = endCoords.left - startCoords.left; const deltaY = endCoords.top - startCoords.top; clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.1)`; clone.style.opacity = '0'; setTimeout(() => { clone.remove(); if (onComplete) { onComplete(); } }, duration); }
function dealCardsAnimated(numCards, onFinish) { let cardsDealtTotal = 0; const totalToDeal = numCards * players.length; let playerDealIndex = 0; let cardDealCount = 0; const dealDelay = 150; function dealOneCard() { if (cardDealCount >= numCards || deck.length === 0) { renderGame(); renderDeckVisual(); if (onFinish) { onFinish(); } return; } const player = players[playerDealIndex]; const card = deck.pop(); if (!card) { setTimeout(dealOneCard, 10); return; } player.hand.push(card); cardsDealtTotal++; const deckCardElement = deckVisualArea.lastElementChild || deckVisualArea; const deckCoords = getElementCoords(deckCardElement); const handCoords = getElementCoords(player.elementRefs.hand); const targetCoords = { left: handCoords.left + (player.isPrimaryHuman ? (player.hand.length - 1) * 15 : Math.random() * (handCoords.width - 60)), top: handCoords.top + 5 + (player.isPrimaryHuman ? 0 : Math.random() * 10) }; const cardBack = renderCard(card, true); animateCardMove(cardBack, deckCoords, targetCoords, 400, () => { renderPlayerHand(player); renderDeckVisual(); }); playerDealIndex = (playerDealIndex + 1) % players.length; if (playerDealIndex === 0) { cardDealCount++; } setTimeout(dealOneCard, dealDelay); } dealOneCard(); }

function endTurnSequence(playerWhoPlayed) {
    scoopActionsDiv.style.display = 'none'; skipScoopBtn.disabled = true; confirmScoopBtn.disabled = true;
    esunBuildActionsDiv.style.display = 'none'; confirmEsunBuildBtn.disabled = true; cancelEsunBuildBtn.disabled = true;
    tablePaletteElement.classList.remove('scoop-selection-active', 'esun-building-active');
    currentTurnData = { playedCard: null, potentialScoops: [], selectedScoop: null };
    esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null };

    let handsEmpty = players.every(p => p.hand.length === 0); let roundOver = handsEmpty && deck.length === 0;
    if (roundOver) {
        logMessage("--- Round Over ---");
        if (tableCards.length > 0) { if (lastPlayerToScoop !== -1 && gameSettings.endOfHandRule === 'LastScoopWins') { const s = players[lastPlayerToScoop]; logMessage(`${s.name} scoops remaining ${tableCards.length}.`); s.scoopedPile.push(...tableCards) } else logMessage(`Discarding ${tableCards.length}.`); tableCards = [] }
        if (esunPiles.length > 0) { logMessage(`Discarding ${esunPiles.length} Esun pile(s).`); esunPiles = [] }
        calculateScores(); currentRound++;
        if (currentRound > gameSettings.gameLengthValue) {
            gameState = 'GameOver'; logMessage("--- GAME OVER ---"); displayGameOver(); renderGame(); return
        } else {
            logMessage(`Starting Round ${currentRound}...`); lastPlayerToScoop = -1; players.forEach(p => p.scoopedPile = []); logMessage("Dealing cards..."); renderGame();
            dealCardsAnimated(4, () => { logMessage("Dealing complete for new round."); if (gameState !== 'GameOver') { advanceTurnInternal(); } }); return;
        }
    } else if (handsEmpty && deck.length > 0) { logMessage("Hands empty, dealing..."); renderGame(); dealCardsAnimated(4, () => { logMessage("Dealing complete."); if (gameState !== 'GameOver') { advanceTurnInternal(); } }); return; }

    if (gameState !== 'GameOver') { advanceTurnInternal(); }
    else { renderGame(); }
}

function advanceTurnInternal() {
    if (gameState === 'GameOver') return;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    logMessage(`It's ${players[currentPlayerIndex]?.name || '?'}'s turn.`);
    selectedPlayerCard = null;

    if (player1HandElement) player1HandElement.removeEventListener('click', handlePlayerHandClick);

    if (players[currentPlayerIndex]?.isAI) {
        gameState = 'AITurn';
        renderGame();
        setTimeout(playAITurn, 1000);
    } else {
        gameState = 'PlayerTurn';
        if (players[currentPlayerIndex]?.isPrimaryHuman && player1HandElement) {
            player1HandElement.addEventListener('click', handlePlayerHandClick);
        }
        renderGame();
    }
}

function calculateScores() { logMessage("--- Score Update ---"); players.forEach(p => { const s = p.scoopedPile.length; p.score += s; logMessage(`${p.name}: Scooped ${s} cards (Total Score: ${p.score})`) }) }
function displayGameOver() { let highScore = -1; players.forEach(p => { if (p.score > highScore) highScore = p.score; }); const winners = players.filter(p => p.score === highScore); let scoreTableHTML = '<table><thead><tr><th>Player</th><th>Final Score</th></tr></thead><tbody>'; const sortedPlayers = [...players].sort((a, b) => b.score - a.score); sortedPlayers.forEach(p => { scoreTableHTML += `<tr><td>${p.name}</td><td>${p.score}</td></tr>`; }); scoreTableHTML += '</tbody></table>'; finalScoresDiv.innerHTML = scoreTableHTML; if (winners.length === 1) { winnerAnnouncement.textContent = `${winners[0].name} wins!`; logMessage(`${winners[0].name} wins with ${winners[0].score} points!`); } else { winnerAnnouncement.textContent = `It's a tie between ${winners.map(w => w.name).join(' and ')}!`; logMessage(`Tie game with ${highScore} points!`); } gameOverModal.classList.add('visible'); }


// --- 5. Rendering Functions ---

function renderCard(card, isHidden = false) { const cardElement = document.createElement('div'); cardElement.classList.add('card'); cardElement.style.backgroundImage = ''; if (isHidden) { cardElement.classList.add('hidden'); } else { if (card && card.id) { cardElement.dataset.cardId = card.id; if (card.isJoker) { cardElement.classList.add('joker'); cardElement.textContent = 'Joker'; cardElement.style.color = 'purple'; } else { const rankSpan = document.createElement('span'); rankSpan.textContent = card.rank; const suitSpan = document.createElement('span'); suitSpan.textContent = card.suit; cardElement.appendChild(rankSpan); cardElement.appendChild(suitSpan); cardElement.style.color = (card.suit === '♦' || card.suit === '♥') ? 'red' : 'black'; } } } return cardElement; }
function createPlayerAreaElement(player, isHuman = false) { const area = document.createElement('div'); area.classList.add('player-display-area'); area.id = `player-area-${player.id}`; if (isHuman) area.classList.add('human-player-area'); player.elementRefs = player.elementRefs || {}; const infoDiv = document.createElement('div'); infoDiv.classList.add('player-info'); infoDiv.id = `info-player-${player.id}`; const nameSpan = document.createElement('span'); nameSpan.textContent = player.name; infoDiv.appendChild(nameSpan); if (player.isAI) { const tC = document.createElement('div'); tC.classList.add('view-toggle'); const tL = document.createElement('label'); tL.htmlFor = `toggle-view-${player.id}`; tL.textContent = 'Show Cards:'; const tI = document.createElement('input'); tI.type = 'checkbox'; tI.id = `toggle-view-${player.id}`; tI.classList.add('toggle-switch'); tI.dataset.playerId = player.id; tI.checked = player.viewMode === 'visual'; tI.addEventListener('change', handleSingleOpponentViewToggle); tC.appendChild(tL); tC.appendChild(tI); infoDiv.appendChild(tC); player.elementRefs.toggle = tI; } area.appendChild(infoDiv); const handDiv = document.createElement('div'); handDiv.classList.add('hand'); if (isHuman) handDiv.classList.add('player-hand'); else handDiv.classList.add('opponent-hand'); handDiv.id = `hand-player-${player.id}`; area.appendChild(handDiv); player.elementRefs.hand = handDiv; const scoopedInfoDiv = document.createElement('div'); scoopedInfoDiv.classList.add('scooped-info'); const scoopedSpan = document.createElement('span'); scoopedSpan.classList.add('scooped-pile'); scoopedSpan.id = `scooped-player-${player.id}`; scoopedSpan.textContent = 'Scooped: 0'; scoopedInfoDiv.appendChild(scoopedSpan); player.elementRefs.scooped = scoopedSpan; if (isHuman) { const iBtn = document.createElement('button'); iBtn.id = 'view-scooped-btn'; iBtn.classList.add('view-pile-btn'); iBtn.style.display = 'none'; iBtn.disabled = true; iBtn.textContent = '(Isíwò)'; scoopedInfoDiv.appendChild(iBtn); viewScoopedBtn = iBtn; } area.appendChild(scoopedInfoDiv); return area; }
function renderPlayerHand(player) { const handEl = player.elementRefs.hand; if (!handEl) return; handEl.innerHTML = ''; if (player.isAI) { const hS = player.hand.length; if (player.viewMode === 'visual') { handEl.classList.add('visual-cards'); if (hS > 0) { for (let i = 0; i < hS; i++) handEl.appendChild(renderCard({ id: `h-${player.id}-${i}`, isJoker: !1 }, !0)) } else handEl.textContent = 'Hand: 0' } else handEl.textContent = `Hand: ${hS}` } else { player.hand.sort((a, b) => { const sO=["♦","♣","♥","♠",""],rO=["A","2","3","4","5","6","7","8","9","10","J","Q","K","JOKER"];if(a.isJoker&&!b.isJoker)return 1;if(!a.isJoker&&b.isJoker)return-1;if(a.isJoker&&b.isJoker)return 0;const sA=sO.indexOf(a.suit),sB=sO.indexOf(b.suit);if(sA!==sB)return sA-sB;return rO.indexOf(a.rank)-rO.indexOf(b.rank)}); player.hand.forEach(c => { const e = renderCard(c); if (gameState === 'PlayerTurn' && selectedPlayerCard && c.id === selectedPlayerCard.id && player.isPrimaryHuman) e.classList.add('selected'); handEl.appendChild(e); }); } }
function renderDeckVisual() { deckVisualArea.innerHTML = ''; const count = deck.length; deckCountElement.textContent = `Deck: ${count}`; if (count > 0) { const numToShow = Math.min(count, 3); for (let i = 0; i < numToShow; i++) { const cardBack = renderCard({}, true); deckVisualArea.appendChild(cardBack); } } else { deckVisualArea.innerHTML = '<div></div>'; } }

function renderGame() {
    if (gameState === 'Setup') return;
    players.forEach(player => { renderPlayerHand(player); });

    tablePaletteElement.innerHTML = ''; const renderedElements = {};
    esunPiles.forEach(pile => { const pE=document.createElement('div'); pE.classList.add('esun-pile',`owner-${pile.ownerId}`); pE.dataset.esunPileId=pile.id; const cC=document.createElement('div'); cC.classList.add('esun-pile-cards'); pile.cards.forEach(c=>cC.appendChild(renderCard(c))); pE.appendChild(cC); const iE=document.createElement('div'); iE.classList.add('esun-pile-info'); const oN=players.find(p=>p.id===pile.ownerId)?.name||'?'; iE.textContent=`Owner: ${oN.split(' ')[0]} | Needs: ${pile.captureCardRank}`; pE.appendChild(iE); tablePaletteElement.appendChild(pE); renderedElements[pile.id]=pE });
    tableCards.forEach(card => { if (!(gameState === 'BuildingEsun_SelectTable' && esunBuildData.selectedTableCards.some(s => s.id === card.id))) { const cE = renderCard(card); tablePaletteElement.appendChild(cE); renderedElements[card.id] = cE } });

    tablePaletteElement.classList.remove('scoop-selection-active', 'esun-building-active');
    const currentActivePlayerForHighlight = players[currentPlayerIndex];
    const isWaitingForHumanScoop = gameState === 'WaitingForScoop' && currentActivePlayerForHighlight && !currentActivePlayerForHighlight.isAI && currentActivePlayerForHighlight.isPrimaryHuman;
    if (isWaitingForHumanScoop && currentTurnData.playedCard && !currentTurnData.playedCard.isJoker) {
        tablePaletteElement.classList.add('scoop-selection-active');
        // Don't render played card here if animating
        currentTurnData.potentialScoops.forEach(s => { if (s.type === 'esun') { if (renderedElements[s.pile.id]) renderedElements[s.pile.id].classList.add('potential-scoop-card') } else { s.cardsToScoop.forEach(c => { if (renderedElements[c.id] && !renderedElements[c.id].closest('.esun-pile')) renderedElements[c.id].classList.add('potential-scoop-card') }) } });
        if (currentTurnData.selectedScoop) { if (currentTurnData.selectedScoop.type === 'esun') { if (renderedElements[currentTurnData.selectedScoop.pile.id]) renderedElements[currentTurnData.selectedScoop.pile.id].classList.add('selected-for-scoop') } else { currentTurnData.selectedScoop.cardsToScoop.forEach(c => { if (renderedElements[c.id] && !renderedElements[c.id].closest('.esun-pile')) renderedElements[c.id].classList.add('selected-for-scoop') }) } }
    } else if (gameState === 'BuildingEsun_SelectTable' && esunBuildData.cardPlayedForBuild && currentActivePlayerForHighlight && !currentActivePlayerForHighlight.isAI && currentActivePlayerForHighlight.isPrimaryHuman) {
        tablePaletteElement.classList.add('esun-building-active'); const pE = renderCard(esunBuildData.cardPlayedForBuild); pE.classList.add('played-for-build'); tablePaletteElement.prepend(pE);
        esunBuildData.selectedTableCards.forEach(c => { const existingEl = tablePaletteElement.querySelector(`.card[data-card-id="${c.id}"]`); if (existingEl && !existingEl.closest('.esun-pile')) { existingEl.classList.add('selected-for-esun-build') } else { const cE = renderCard(c); cE.classList.add('selected-for-esun-build'); tablePaletteElement.appendChild(cE); } })
    }

    renderDeckVisual();
    currentPlayerElement.textContent = gameState === 'GameOver' ? 'Game Over' : players.length > 0 && gameState !== 'Initializing' ? `Turn: ${players[currentPlayerIndex]?.name || '?'}` : 'Turn: -'; roundInfoElement.textContent = `Round: ${currentRound}/${gameSettings.gameLengthValue}`;
    players.forEach(player => { if (player.elementRefs.scooped) { player.elementRefs.scooped.textContent = `Scooped (Rnd): ${player.scoopedPile.length} (Total: ${player.score})`; } });

    const currentActivePlayer = players[currentPlayerIndex];
    const isHumanT = gameState === 'PlayerTurn' && currentActivePlayer && currentActivePlayer.isPrimaryHuman; const isWait = gameState === 'WaitingForScoop' && currentActivePlayer && currentActivePlayer.isPrimaryHuman; const isBuild = gameState === 'BuildingEsun_SelectTable' && currentActivePlayer && currentActivePlayer.isPrimaryHuman;
    let calculatedPlayBtnDisabled = !isHumanT || !selectedPlayerCard;
    playCardBtn.disabled = calculatedPlayBtnDisabled;
    scoopActionsDiv.style.display = isWait ? 'block' : 'none'; if (isWait) { skipScoopBtn.disabled = false; confirmScoopBtn.disabled = !currentTurnData.selectedScoop }
    buildEsunBtn.style.display = gameSettings.allowEsun ? 'block' : 'none'; buildEsunBtn.disabled = !isHumanT || !selectedPlayerCard || (selectedPlayerCard && selectedPlayerCard.isJoker);
    esunBuildActionsDiv.style.display = isBuild ? 'block' : 'none'; if (isBuild) { confirmEsunBuildBtn.disabled = false; cancelEsunBuildBtn.disabled = false }
    if (viewScoopedBtn) { const humanP = players.find(p => p.isPrimaryHuman); viewScoopedBtn.style.display = gameSettings.allowIsiwo && humanP ? 'inline-block' : 'none'; viewScoopedBtn.disabled = !(humanP && humanP.scoopedPile.length > 0); }
    if (gameState === 'GameOver') { playCardBtn.disabled = true; scoopActionsDiv.style.display = 'none'; buildEsunBtn.disabled = true; esunBuildActionsDiv.style.display = 'none'; if (viewScoopedBtn) viewScoopedBtn.disabled = true; }
}

function logMessage(message) { const logEntry = document.createElement('div'); logEntry.textContent = message; gameLogElement.appendChild(logEntry); gameLogElement.scrollTop = gameLogElement.scrollHeight; }


// --- 6. Event Handler Functions ---

function handlePlayerHandClick(event) { const player = players[currentPlayerIndex]; if (gameState !== 'PlayerTurn' || !player || !player.isPrimaryHuman) return; const clickedElement = event.target.closest('.card'); if (!clickedElement) return; const cardId = clickedElement.dataset.cardId; const previouslySelected = player1HandElement?.querySelector('.card.selected'); if (previouslySelected) previouslySelected.classList.remove('selected'); if (selectedPlayerCard && selectedPlayerCard.id === cardId) { selectedPlayerCard = null; } else { selectedPlayerCard = player.hand.find(card => card.id === cardId); if (selectedPlayerCard) clickedElement.classList.add('selected'); } renderGame(); }
function handlePlayCardClick() { const player = players[currentPlayerIndex]; if (!selectedPlayerCard || gameState !== 'PlayerTurn' || !player || !player.isPrimaryHuman) { console.log("Play Card condition not met:", { gameState: gameState, selectedPlayerCard: selectedPlayerCard, player: player }); return; } const playedCard = selectedPlayerCard; logMessage(`${player.name} plays ${playedCard.display}.`); const cardElementInHand = player1HandElement?.querySelector(`.card[data-card-id="${playedCard.id}"]`); const startCoords = getElementCoords(cardElementInHand); player.hand = player.hand.filter(card => card.id !== playedCard.id); selectedPlayerCard = null; playCardBtn.disabled = true; renderPlayerHand(player); if (cardElementInHand) { const animatingCard = renderCard(playedCard); animatingCard.style.position = 'absolute'; animatingCard.style.zIndex = '1001'; const tableCoords = getElementCoords(tablePaletteElement); const endCoords = { left: tableCoords.left + tableCoords.width / 2 - startCoords.width / 2, top: tableCoords.top + tableCoords.height / 2 - startCoords.height / 2 }; animateCardMove(animatingCard, startCoords, endCoords, 400, () => { handlePostPlayLogic(player, playedCard); }); } else { console.error("Card element not found for play animation."); handlePostPlayLogic(player, playedCard); } }
function handlePostPlayLogic(player, playedCard) { if (playedCard.isJoker) { const tableScoop = tableCards.filter(c => !c.isJoker); if (tableScoop.length > 0) { logMessage(`Joker (Ipalemo)! Scooping ${tableScoop.length} card(s).`); const targetElement = player.elementRefs.scooped?.closest('.scooped-info') || playerAreaContainer; let animationsPending = tableScoop.length; let allAnimsDone = false; const onScoopAnimationComplete = () => { animationsPending--; if (animationsPending <= 0 && !allAnimsDone) { allAnimsDone = true; player.scoopedPile.push(playedCard, ...tableScoop); lastPlayerToScoop = players.findIndex(pl => pl.id === player.id); const scoopedIds = new Set(tableScoop.map(c => c.id)); tableCards = tableCards.filter(c => !scoopedIds.has(c.id)); endTurnSequence(player); } }; if(animationsPending === 0){ onScoopAnimationComplete(); return; } tableScoop.forEach(cardToScoop => { const cardEl = tablePaletteElement.querySelector(`.card[data-card-id="${cardToScoop.id}"]`); if (cardEl) animateScoop(cardEl, targetElement, 600, onScoopAnimationComplete); else { animationsPending--; console.warn("Scooped card element not found for Joker animation:", cardToScoop.id); } }); if (animationsPending === 0 && !allAnimsDone) { onScoopAnimationComplete(); } } else { logMessage("Joker scoops nothing."); tableCards.push(playedCard); renderGame(); endTurnSequence(player); } } else { const potentialActions = checkForScoops(playedCard, tableCards, esunPiles); if (potentialActions.length > 0) { gameState = 'WaitingForScoop'; currentTurnData = { playedCard: playedCard, potentialScoops: potentialActions, selectedScoop: null }; logMessage(`Potential scoops/captures found.`); console.log("Potentials:", potentialActions); tableCards.push(playedCard); renderGame(); tableCards.pop(); } else { logMessage(`No scoops or Esun captures possible.`); tableCards.push(playedCard); renderGame(); endTurnSequence(player); } } }
function handleTableClick(event) { const player = players[currentPlayerIndex]; if (gameState === 'WaitingForScoop' && player?.isPrimaryHuman) { const pE = event.target.closest('.esun-pile'), cE = event.target.closest('.card'); if (pE && pE.classList.contains('potential-scoop-card')) { handleTableEsunCaptureClick(event, pE.dataset.esunPileId) } else if (cE && cE.classList.contains('potential-scoop-card') && !cE.closest('.esun-pile')) { handleTableNormalScoopClick(event, cE) } } else if (gameState === 'BuildingEsun_SelectTable' && player?.isPrimaryHuman) { handleTableEsunBuildClick(event) } }
function handleTableNormalScoopClick(event, clickedCardElement) { const clickedCardId = clickedCardElement.dataset.cardId; let newlySelectedScoop = null; for (const scoop of currentTurnData.potentialScoops) { if ((scoop.type === 'rank' || scoop.type === 'sum') && scoop.cardsToScoop.some(card => card.id === clickedCardId)) { newlySelectedScoop = scoop; break } } if (newlySelectedScoop) { currentTurnData.selectedScoop = (currentTurnData.selectedScoop === newlySelectedScoop) ? null : newlySelectedScoop; logMessage(currentTurnData.selectedScoop ? `Selected: ${newlySelectedScoop.type} ${newlySelectedScoop.cardsToScoop.map(c => c.display).join(',')}` : "Selection cleared."); renderGame(); } }
function handleTableEsunCaptureClick(event, clickedPileId) { let newlySelectedScoop = null; for (const scoop of currentTurnData.potentialScoops) { if (scoop.type === 'esun' && scoop.pile.id === clickedPileId) { newlySelectedScoop = scoop; break } } if (newlySelectedScoop) { currentTurnData.selectedScoop = (currentTurnData.selectedScoop === newlySelectedScoop) ? null : newlySelectedScoop; logMessage(currentTurnData.selectedScoop ? `Selected Esun capture: ${newlySelectedScoop.pile.id}` : "Esun selection cleared."); renderGame(); } else logMessage("Cannot capture clicked pile."); }
function handleTableEsunBuildClick(event) { const clickedElement = event.target.closest('.card'); if (!clickedElement || clickedElement.classList.contains('played-for-build') || clickedElement.closest('.esun-pile')) return; const clickedCardId = clickedElement.dataset.cardId; const cardObject = tableCards.find(c => c.id === clickedCardId); if (!cardObject || cardObject.isJoker) { if(cardObject?.isJoker) alert("Cannot add Jokers to Esun pile."); return; } const index = esunBuildData.selectedTableCards.findIndex(card => card.id === clickedCardId); if (index > -1) { esunBuildData.selectedTableCards.splice(index, 1); } else { esunBuildData.selectedTableCards.push(cardObject); } console.log("Esun build selection:", esunBuildData.selectedTableCards.map(c => c.display)); renderGame(); }
function handleSkipScoopClick() { const player = players[currentPlayerIndex]; if (gameState !== 'WaitingForScoop' || !player || !player.isPrimaryHuman) return; const playedCard = currentTurnData.playedCard; logMessage(`${player.name} skips scoop/capture.`); const playedCardElement = tablePaletteElement.querySelector('.played-for-scoop'); if(playedCardElement) playedCardElement.classList.remove('played-for-scoop'); tableCards.push(playedCard); currentTurnData = { playedCard: null, potentialScoops: [], selectedScoop: null }; endTurnSequence(player); }
function handleConfirmScoopClick() { const player = players[currentPlayerIndex]; if (gameState !== 'WaitingForScoop' || !currentTurnData.selectedScoop || !player || !player.isPrimaryHuman) return; const playedCard = currentTurnData.playedCard; const chosenScoop = currentTurnData.selectedScoop; const targetElement = player.elementRefs.scooped?.closest('.scooped-info') || playerAreaContainer; scoopActionsDiv.style.display = 'none'; if (chosenScoop.type === 'esun') { const pileToCapture = chosenScoop.pile; const pileElement = tablePaletteElement.querySelector(`.esun-pile[data-esun-pile-id="${pileToCapture.id}"]`); logMessage(`${player.name} captures Esun pile ${pileToCapture.id}.`); let animationsPending = (pileElement ? 1 : 0); let animDone = false; const onCaptureComplete = () => { if (animDone) return; animDone = true; player.scoopedPile.push(playedCard, ...pileToCapture.cards); esunPiles = esunPiles.filter(p => p.id !== pileToCapture.id); lastPlayerToScoop = players.findIndex(pl => pl.id === player.id); endTurnSequence(player); }; const playedCardElementVis = tablePaletteElement.querySelector('.played-for-scoop'); if(playedCardElementVis) playedCardElementVis.remove(); if (pileElement) animateScoop(pileElement, targetElement, 600, onCaptureComplete); else onCaptureComplete(); } else { logMessage(`${player.name} scoops.`); const cardsToAnimate = [...chosenScoop.cardsToScoop]; const playedCardElementVis = tablePaletteElement.querySelector('.played-for-scoop'); let animationsPending = cardsToAnimate.length + (playedCardElementVis ? 1 : 0); let animDone = false; const onScoopComplete = () => { animationsPending--; if (animationsPending <= 0 && !animDone) { animDone = true; executeScoop(player, playedCard, chosenScoop); endTurnSequence(player); } }; if (playedCardElementVis) animateScoop(playedCardElementVis, targetElement, 600, onScoopComplete); cardsToAnimate.forEach(cardData => { const cardEl = tablePaletteElement.querySelector(`.card[data-card-id="${cardData.id}"]`); if (cardEl) animateScoop(cardEl, targetElement, 600, onScoopComplete); else animationsPending--; }); if (animationsPending <= 0 && !animDone) { onScoopComplete(); } } }
function handleBuildEsunClick() { const player = players[currentPlayerIndex]; if (!selectedPlayerCard || gameState !== 'PlayerTurn' || !player || !player.isPrimaryHuman || !gameSettings.allowEsun || selectedPlayerCard.isJoker) { if (selectedPlayerCard && selectedPlayerCard.isJoker) alert("Cannot build Esun with Joker."); return } const buildCard = selectedPlayerCard; const captureCard = player.hand.find(card => card.rank === buildCard.rank && card.id !== buildCard.id && !card.isJoker); if (!captureCard) { alert(`Need another ${buildCard.rank} (non-Joker) in hand.`); return } gameState = 'BuildingEsun_SelectTable'; esunBuildData = { cardPlayedForBuild: buildCard, selectedTableCards: [], requiredCaptureCard: captureCard }; logMessage(`Building Esun with ${buildCard.display}. Select table cards?`); console.log("Esun build state. Require:", captureCard.id); renderGame(); }
function handleConfirmEsunBuildClick() { const player = players[currentPlayerIndex]; if (gameState !== 'BuildingEsun_SelectTable' || !player || !player.isPrimaryHuman) return; const buildCard = esunBuildData.cardPlayedForBuild; const tS = esunBuildData.selectedTableCards; const cR = buildCard.rank; const pileCards = [buildCard, ...tS].filter(c => !c.isJoker); let valid = true; if (gameSettings.ruleset === 'Yorùbá') { const r = pileCards.map(c => c.rank), u = new Set(r); if (r.length !== u.size) { alert("Yorùbá Esun Block: Pile duplicates."); valid = false; } if (valid && r.includes(cR)) { alert(`Yorùbá Esun Block: Capture rank ${cR} in pile.`); valid = false; } } if (!valid) return; const buildCardElement = player1HandElement?.querySelector(`.card[data-card-id="${buildCard.id}"]`); const tableCardElements = tS.map(c => tablePaletteElement.querySelector(`.card[data-card-id="${c.id}"]`)); if(buildCardElement) {buildCardElement.style.opacity = '0'; buildCardElement.style.visibility='hidden';} tableCardElements.forEach(el => {if(el){ el.style.opacity = '0'; el.style.visibility='hidden';}}); const nP = { id: `esun-${nextEsunPileId++}`, ownerId: player.id, cards: pileCards, captureCardRank: cR }; esunPiles.push(nP); logMessage(`${player.name} built Esun (${pileCards.map(c => c.display).join(', ')}). Needs ${cR}.`); console.log("Built Esun:", nP); player.hand = player.hand.filter(c => c.id !== buildCard.id); const ids = new Set(tS.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id)); selectedPlayerCard = null; endTurnSequence(player); }
function handleCancelEsunBuildClick() { const player = players[currentPlayerIndex]; if (gameState !== 'BuildingEsun_SelectTable' || !player || !player.isPrimaryHuman) return; logMessage("Esun build cancelled."); gameState = 'PlayerTurn'; esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null }; renderGame(); }
function handleSingleOpponentViewToggle(event) { const toggle = event.target; const playerId = parseInt(toggle.dataset.playerId); const player = players.find(p => p.id === playerId); if (player && player.isAI) { player.viewMode = toggle.checked ? 'visual' : 'count'; console.log(`Player ${playerId} view mode set to: ${player.viewMode}`); renderGame(); } else { console.warn(`Could not find AI player with ID ${playerId} for view toggle.`); } }
function toggleIsiwoView() { if (!gameSettings.allowIsiwo) return; const player = players.find(p => p.isPrimaryHuman); if (!player) return; const isVisible = isiwoModal.classList.contains('visible'); if (isVisible) { isiwoModal.classList.remove('visible'); } else { if (player.scoopedPile.length === 0) { logMessage("No cards in scooped pile."); return; } isiwoCardsDisplay.innerHTML = ''; const sortedPile = [...player.scoopedPile].sort((a, b) => { const suitOrder = ["♦", "♣", "♥", "♠", ""], rankOrder = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"]; if (a.isJoker && !b.isJoker) return 1; if (!a.isJoker && b.isJoker) return -1; if (a.isJoker && b.isJoker) return 0; const suitAIndex = suitOrder.indexOf(a.suit), suitBIndex = suitOrder.indexOf(b.suit); if (suitAIndex !== suitBIndex) { return suitAIndex - suitBIndex; } return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank); }); sortedPile.forEach(card => { isiwoCardsDisplay.appendChild(renderCard(card)); }); isiwoModal.classList.add('visible'); } }
function handlePlayAgain() { gameOverModal.classList.remove('visible'); gameContainer.style.display = 'none'; setupModal.classList.add('visible'); gameState = 'Setup'; gameLogElement.innerHTML = 'Welcome! Configure your game.<br>'; generatePlayerConfigUI(parseInt(numPlayersSelect.value)); }

// --- 7. AI Logic ---
function getAIEasyPlay(aiPlayer) { if (aiPlayer.hand.length === 0) return null; const cardToPlay = aiPlayer.hand[0]; let play = { card: cardToPlay, scoop: null, esunCapture: null, isJokerPlay: cardToPlay.isJoker, esunBuild: null, value: 0 }; if (!cardToPlay.isJoker) { const potentialActions = checkForScoops(cardToPlay, tableCards, esunPiles); if (potentialActions.length > 0) { play.esunCapture = potentialActions.find(a => a.type === 'esun'); if (!play.esunCapture) { play.scoop = potentialActions[0]; } } } else { play.value = tableCards.filter(c => !c.isJoker).length + 1; } return play; }
function getAIMediumPlay(aiPlayer) { /*console.log(`--- AI Medium: Evaluating Hand for ${aiPlayer.name} ---`);*/ let bestPlay = { card: null, scoop: null, esunCapture: null, esunBuild: null, value: -1, isJokerPlay: false }; const JOKER_THRESHOLD = 2; const playableJoker = aiPlayer.hand.find(c => c.isJoker); const clearableTableCards = tableCards.filter(c => !c.isJoker); if (gameSettings.allowEsun) { for (const card of aiPlayer.hand) { if (card.isJoker) continue; /*console.log(`AI Medium: Checking card ${card.id} for Esun capture...`);*/ const actions = checkForScoops(card, tableCards, esunPiles); const capture = actions.find(s => s.type === 'esun'); if (capture) { let v = capture.pile.cards.length + 1 + (capture.pile.ownerId !== aiPlayer.id ? 3 : 0); /*console.log(`AI Medium: Found Esun Capture with ${card.id}. Value: ${v}`);*/ if (v > bestPlay.value) { bestPlay = { card: card, esunCapture: capture, value: v, scoop: null, esunBuild: null, isJokerPlay: false }; /*console.log(`AI Medium: New best play -> Esun Capture with ${card.id}`);*/ } } } if (bestPlay.esunCapture) { /*console.log(`AI Medium: Found Esun Capture, returning immediately.`);*/ return bestPlay; } } bestPlay = { card: null, scoop: null, esunCapture: null, esunBuild: null, value: -1, isJokerPlay: false }; /*console.log("AI Medium: No Esun capture. Evaluating Joker/Scoops.");*/ if (playableJoker && clearableTableCards.length >= JOKER_THRESHOLD) { let v = clearableTableCards.length + 1; /*console.log(`AI Medium: Evaluating Joker. Value: ${v}`);*/ bestPlay = { card: playableJoker, value: v, isJokerPlay: true, scoop: null, esunCapture: null, esunBuild: null }; /*console.log(`AI Medium: Tentatively selecting Joker (value ${v}).`);*/ } for (const card of aiPlayer.hand) { if (card.isJoker) continue; /*console.log(`AI Medium: Checking normal scoops for card ${card.id}...`);*/ const actions = checkForScoops(card, tableCards, esunPiles); const normalScoops = actions.filter(s => s.type === 'rank' || s.type === 'sum'); /*console.log(`AI Medium: Normal scoops found for ${card.id}:`, JSON.parse(JSON.stringify(normalScoops)));*/ if (normalScoops.length > 0) { let bS = normalScoops.reduce((b, c) => (c.cardsToScoop.length > b.cardsToScoop.length) ? c : b, normalScoops[0]); let v = bS.cardsToScoop.length + 1; /*console.log(`AI Medium: Card ${card.id} -> Best Normal Scoop Value: ${v}, Current Best Play Value: ${bestPlay.value}`);*/ if (v > bestPlay.value) { /*console.log(`AI Medium: Updating bestPlay -> Scoop with ${card.id} (Value: ${v})`);*/ bestPlay = { card: card, scoop: bS, value: v, isJokerPlay: false, esunCapture: null, esunBuild: null }; } else { /*console.log(`AI Medium: Scoop with ${card.id} (Value: ${v}) is NOT better than current best (Value: ${bestPlay.value}).`);*/ } } else { /*console.log(`AI Medium: No normal scoops found for ${card.id}`);*/ } } /* TODO: Evaluate Build Esun */ if (!bestPlay.card) { /*console.log("AI Medium: No scooping play found, choosing fallback card.");*/ bestPlay.card = aiPlayer.hand.find(c => !c.isJoker) || aiPlayer.hand[0]; bestPlay.isJokerPlay = bestPlay.card.isJoker; if (!bestPlay.isJokerPlay) { const fa = checkForScoops(bestPlay.card, tableCards, esunPiles); bestPlay.scoop = fa.find(s => s.type === 'rank' || s.type === 'sum'); } } /*console.log("--- AI Medium: Final Chosen Play ---", JSON.parse(JSON.stringify(bestPlay)));*/ return bestPlay; }
function getAIHardPlay(aiPlayer) { /* console.log(`--- AI Hard: Evaluating Hand for ${aiPlayer.name} ---`);*/ let bestPlay = { card: null, scoop: null, esunCapture: null, esunBuild: null, value: -1, isJokerPlay: false }; const JOKER_THRESHOLD = 3; const playableJoker = aiPlayer.hand.find(c => c.isJoker); const clearableTableCards = tableCards.filter(c => !c.isJoker); const possiblePlays = []; if (gameSettings.allowEsun) { for (const card of aiPlayer.hand) { if (card.isJoker) continue; /*console.log(`AI Hard: Checking card ${card.id}`);*/ const actions = checkForScoops(card, tableCards, esunPiles); const capture = actions.find(s => s.type === 'esun'); /*console.log(`AI Hard: Actions for ${card.id}:`, JSON.parse(JSON.stringify(actions)));*/ if (capture) { let v = 100 + capture.pile.cards.length + (capture.pile.ownerId !== aiPlayer.id ? 50 : 0); /*console.log(`AI Hard: Found Esun Capture for ${card.id}. Value: ${v}`);*/ possiblePlays.push({ card: card, action: capture, value: v, isJokerPlay: false }); continue; } const scoops = actions.filter(s => s.type === 'rank' || s.type === 'sum'); let currentPlayForCard = null; if (scoops.length > 0) { let bestScoop = scoops.reduce((b, c) => (c.cardsToScoop.length > b.cardsToScoop.length) ? c : b, scoops[0]); let v = 10 + bestScoop.cardsToScoop.length; /*console.log(`AI Hard: Found Normal Scoop for ${card.id}. Value: ${v}`);*/ currentPlayForCard = { card: card, action: bestScoop, value: v }; } const canBuild = gameSettings.allowEsun && !card.isJoker && aiPlayer.hand.some(c => c.rank === card.rank && c.id !== card.id && !c.isJoker); if (canBuild) { let buildValue = 5; /*console.log(`AI Hard: Card ${card.id} can build. Value: ${buildValue}. Current play value: ${currentPlayForCard?.value || 0}`);*/ if (!currentPlayForCard || buildValue > currentPlayForCard.value) { /*console.log(`AI Hard: Considering Build for ${card.id} as best action.`);*/ currentPlayForCard = { card: card, action: { type: 'build' }, value: buildValue }; } } if (!currentPlayForCard) { let playValue = 1; /*console.log(`AI Hard: No scoop/capture/build for ${card.id}. Considering play_only. Value: ${playValue}`);*/ currentPlayForCard = { card: card, action: { type: 'play_only' }, value: playValue }; } if(currentPlayForCard) { /*console.log(`AI Hard: Adding play for ${card.id} to possiblePlays:`, JSON.parse(JSON.stringify(currentPlayForCard)));*/ possiblePlays.push(currentPlayForCard); } else { console.warn(`AI Hard: No play determined for card ${card.id} after evaluation?`); } } } if (playableJoker) { let jokerValue = 0; if (clearableTableCards.length >= JOKER_THRESHOLD) { jokerValue = 50 + clearableTableCards.length; } else if (clearableTableCards.length > 0) { jokerValue = 5 + clearableTableCards.length; } /*console.log(`AI Hard: Evaluating Joker. Value: ${jokerValue}`);*/ possiblePlays.push({ card: playableJoker, action: { type: 'joker' }, value: jokerValue, isJokerPlay: true }); } if (possiblePlays.length > 0) { possiblePlays.sort((a, b) => b.value - a.value); /*console.log("AI Hard: All possible plays evaluated:", JSON.parse(JSON.stringify(possiblePlays)));*/ let chosenData = possiblePlays[0]; bestPlay = { card: chosenData.card, scoop: chosenData.action?.type === 'rank' || chosenData.action?.type === 'sum' ? chosenData.action : null, esunCapture: chosenData.action?.type === 'esun' ? chosenData.action : null, esunBuild: chosenData.action?.type === 'build' ? chosenData.action : null, value: chosenData.value, isJokerPlay: !!chosenData.isJokerPlay }; /*console.log(`AI Hard: Chose play with value ${bestPlay.value} for card ${bestPlay.card.id}`);*/ } else if (aiPlayer.hand.length > 0) { console.warn("AI Hard: No possible plays evaluated! Playing first card as failsafe."); bestPlay.card = aiPlayer.hand[0]; bestPlay.isJokerPlay = bestPlay.card.isJoker; if (!bestPlay.isJokerPlay) { const fa = checkForScoops(bestPlay.card, tableCards, esunPiles); bestPlay.esunCapture = fa.find(s => s.type === 'esun'); if (!bestPlay.esunCapture) bestPlay.scoop = fa.find(s => s.type === 'rank' || s.type === 'sum'); } } else { return null; } /*console.log("--- AI Hard: Final Decision ---", JSON.parse(JSON.stringify(bestPlay)));*/ return bestPlay; }

function playAITurn() { // Uses refined execution block
    if (gameState !== 'AITurn') return;
    const aiPlayer = players[currentPlayerIndex];
    logMessage(`${aiPlayer.name}'s turn (AI ${aiPlayer.aiLevel || 'Default'})...`);
    if (!aiPlayer || aiPlayer.hand.length === 0) { logMessage(`${aiPlayer.name} no cards.`); endTurnSequence(aiPlayer); return; }

    let chosenPlay = null;
    switch (aiPlayer.aiLevel) {
        case 'Hard': chosenPlay = getAIHardPlay(aiPlayer); break;
        case 'Medium': chosenPlay = getAIMediumPlay(aiPlayer); break;
        case 'Easy': default: chosenPlay = getAIEasyPlay(aiPlayer); break;
    }

    if (!chosenPlay || !chosenPlay.card) { logMessage(`Error: AI (${aiPlayer.aiLevel}) could not determine play.`); if (aiPlayer.hand.length > 0) { chosenPlay = { card: aiPlayer.hand[0], isJokerPlay: aiPlayer.hand[0].isJoker }; logMessage(`AI playing failsafe: ${chosenPlay.card.display}`); } else { endTurnSequence(aiPlayer); return; } }

    const cardToPlay = chosenPlay.card;
    logMessage(`${aiPlayer.name} plays ${cardToPlay.display}.`);

    const aiHandEl = aiPlayer.elementRefs.hand; const handCoords = getElementCoords(aiHandEl); const startCoords = { left: handCoords.left + handCoords.width / 2 - 30, top: handCoords.top + 10 }; const tableCoords = getElementCoords(tablePaletteElement); const endCoords = { left: tableCoords.left + tableCoords.width / 2 - 30, top: tableCoords.top + tableCoords.height / 2 - 45 };
    aiPlayer.hand = aiPlayer.hand.filter(c => c.id !== cardToPlay.id); renderPlayerHand(aiPlayer);
    const animatingCard = renderCard(cardToPlay);
    animateCardMove(animatingCard, startCoords, endCoords, 400, () => { executeAIChosenAction(aiPlayer, cardToPlay, chosenPlay); });
}

function executeAIChosenAction(aiPlayer, cardToPlay, chosenPlay) {
    // --- REFINED EXECUTION BLOCK ---
    console.log(`AI EXECUTE: Final chosenPlay Object:`, JSON.parse(JSON.stringify(chosenPlay)));
    console.log(`AI EXECUTE: Checking properties -> scoop: ${!!chosenPlay.scoop}, esunCapture: ${!!chosenPlay.esunCapture}, isJokerPlay: ${!!chosenPlay.isJokerPlay}, esunBuild: ${!!chosenPlay.esunBuild}`); // DEBUG Check truthiness

    let actionTaken = false;
    const targetElement = aiPlayer.elementRefs.scooped?.closest('.scooped-info') || opponentAreaContainer;

    if (chosenPlay.esunCapture?.type === 'esun') { // Check Esun Capture FIRST
        console.log("AI EXECUTE: Condition MET for Esun Capture"); actionTaken = true;
        const pile = chosenPlay.esunCapture.pile; const pileElement = tablePaletteElement.querySelector(`.esun-pile[data-esun-pile-id="${pile.id}"]`); logMessage(`${aiPlayer.name} captures Esun pile ${pile.id}.`);
        let animationsPending = (pileElement ? 1 : 0); let animDone = false; const onCaptureComplete = () => { if (animDone) return; animDone = true; aiPlayer.scoopedPile.push(cardToPlay, ...pile.cards); esunPiles = esunPiles.filter(p => p.id !== pile.id); lastPlayerToScoop = currentPlayerIndex; endTurnSequence(aiPlayer); };
        if (pileElement) animateScoop(pileElement, targetElement, 600, onCaptureComplete); else onCaptureComplete(); return; // Animation handles end turn
    }
    else if (chosenPlay.isJokerPlay === true) { // Check Joker next
        console.log("AI EXECUTE: Condition MET for Joker Play"); actionTaken = true;
        const s = tableCards.filter(c => !c.isJoker);
        if (s.length > 0) { logMessage(`Joker scoops ${s.length}.`); let animationsPending = s.length; let allAnimsDone = false; const onScoopAnimationComplete = () => { animationsPending--; if (animationsPending <= 0 && !allAnimsDone) { allAnimsDone = true; aiPlayer.scoopedPile.push(cardToPlay, ...s); lastPlayerToScoop = currentPlayerIndex; const ids = new Set(s.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id)); endTurnSequence(aiPlayer); } }; if(animationsPending === 0){ onScoopAnimationComplete(); return; } s.forEach(cardToScoop => { const cardEl = tablePaletteElement.querySelector(`.card[data-card-id="${cardToScoop.id}"]`); if (cardEl) animateScoop(cardEl, targetElement, 600, onScoopAnimationComplete); else { animationsPending--; console.warn("Scooped card element not found for AI Joker animation:", cardToScoop.id); } }); if (animationsPending === 0 && !allAnimsDone) { onScoopAnimationComplete(); } }
        else { logMessage("AI Joker scoops nothing."); tableCards.push(cardToPlay); renderGame(); endTurnSequence(aiPlayer); }
        return; // Joker logic handles end turn
    }
    else if (chosenPlay.scoop?.cardsToScoop && Array.isArray(chosenPlay.scoop.cardsToScoop)) { // Check Normal Scoop
        console.log("AI EXECUTE: Condition MET for Normal Scoop"); actionTaken = true;
        logMessage(`${aiPlayer.name} scoops.`); const cardsToAnimate = [...chosenPlay.scoop.cardsToScoop];
        let animationsPending = cardsToAnimate.length + 1; let animDone = false;
        const onScoopComplete = () => { animationsPending--; if (animationsPending <= 0 && !animDone) { animDone = true; executeScoop(aiPlayer, cardToPlay, chosenPlay.scoop); endTurnSequence(aiPlayer); } };
        animationsPending--; // Account for played card visually gone
        cardsToAnimate.forEach(cardData => { const cardEl = tablePaletteElement.querySelector(`.card[data-card-id="${cardData.id}"]`); if (cardEl) animateScoop(cardEl, targetElement, 600, onScoopComplete); else animationsPending--; });
        if (animationsPending <= 0 && !animDone) { onScoopComplete(); }
        return; // Normal scoop animation handles end turn
    }
    else if (chosenPlay.esunBuild?.type === 'build') { // Check Esun Build
         console.log("AI EXECUTE: Condition MET for Esun Build (Placeholder)."); actionTaken = true;
         logMessage(`${aiPlayer.name} builds an Esun pile (AI logic TBD).`); tableCards.push(cardToPlay); renderGame(); // Placeholder action
    }

    // Fallback if no action block entered
    if (!actionTaken) {
        console.log("AI EXECUTE: No specific action taken (actionTaken=false), placing card on table."); actionTaken = true;
        logMessage(`${aiPlayer.name} places card.`); tableCards.push(cardToPlay); renderGame();
    }

    // Only call endTurnSequence directly if no animation handled it (Build or Play Only)
    if (actionTaken && !chosenPlay.esunCapture && !chosenPlay.isJokerPlay && !chosenPlay.scoop) {
         endTurnSequence(aiPlayer);
    } else if (!actionTaken) {
        // This case should ideally not be reached
        console.error("AI Action Fallback Error - No action taken, ending turn.");
        endTurnSequence(aiPlayer);
    }
}

// --- 8. Game Initialization and Startup ---

function generatePlayerConfigUI(numPlayers) { playerConfigArea.innerHTML = ''; for (let i = 1; i <= numPlayers; i++) { const isP1 = i === 1; const d = document.createElement('div'); d.classList.add('player-config'); const l = document.createElement('label'); l.htmlFor = `player-type-${i}`; l.textContent = `Player ${i}:`; const s = document.createElement('select'); s.id = `player-type-${i}`; s.name = `player-type-${i}`; if (isP1) { s.innerHTML = `<option value="Human" selected>Human (You)</option>`; s.disabled = true; } else { s.innerHTML = `<option value="AI_${DEFAULT_AI_LEVEL}" selected>AI (${DEFAULT_AI_LEVEL})</option><option value="Human">Human</option><option value="AI_Easy">AI (Easy)</option><option value="AI_Medium">AI (Medium)</option><option value="AI_Hard">AI (Hard)</option><option value="None">None</option>`; } d.appendChild(l); d.appendChild(s); playerConfigArea.appendChild(d); } }
function handleNumPlayersChange() { const num = parseInt(numPlayersSelect.value); generatePlayerConfigUI(num); }

function handleSetupFormSubmit(event) {
    event.preventDefault();
    const numPlayers = parseInt(numPlayersSelect.value); const playersConfig = []; let humanPlayerAssigned = false;
    for (let i = 1; i <= numPlayers; i++) { const typeSelect = document.getElementById(`player-type-${i}`); if (!typeSelect) continue; const selectedValue = typeSelect.value; if (selectedValue !== 'None') { let isAI = selectedValue.startsWith('AI'); let aiLevel = isAI ? selectedValue.split('_')[1] || DEFAULT_AI_LEVEL : null; let isThisHuman = !isAI; let isPrimaryHuman = false; if (isThisHuman && !humanPlayerAssigned) { isPrimaryHuman = true; humanPlayerAssigned = true; } else if (isThisHuman && humanPlayerAssigned) { console.warn(`Player ${i} set to Human, but only one primary human supported. Treating as AI.`); isAI = true; aiLevel = DEFAULT_AI_LEVEL; isThisHuman = false; } playersConfig.push({ id: i, name: isPrimaryHuman ? `Player ${i} (You)` : isAI ? `Player ${i} (AI ${aiLevel})` : `Player ${i} (Human ${i})`, isAI: isAI, aiLevel: aiLevel, isPrimaryHuman: isPrimaryHuman, viewMode: 'count' }); } }
    if (playersConfig.length < 2) { alert("Please configure at least 2 active players."); return; } if (!playersConfig.some(p => p.isPrimaryHuman)) { alert("At least one player must be 'Human (You)'."); return; }
    gameSettings = { numberOfPlayers: playersConfig.length, playersConfig: playersConfig, playDirection: 'CW', gameMode: gameModeSelect.value, ruleset: rulesetSelect.value, allowEsun: allowEsunCheckbox.checked, allowIsiwo: allowIsiwoCheckbox.checked, endOfHandRule: 'LastScoopWins', gameLengthMode: 'Rounds', gameLengthValue: parseInt(gameLengthInput.value) || 1, };
    console.log("Starting game with settings:", gameSettings); setupModal.classList.remove('visible'); gameContainer.style.display = 'flex';
    setupGame();
}

function setupGame() {
    gameState = 'Initializing'; logMessage("--- Setting up New Game ---");
    logMessage(`Mode: ${gameSettings.gameMode}, Rules: ${gameSettings.ruleset}, Esun: ${gameSettings.allowEsun ? 'On' : 'Off'}, Isiwo: ${gameSettings.allowIsiwo ? 'On' : 'Off'}, Rounds: ${gameSettings.gameLengthValue}`);
    deck = createDeck(); shuffleDeck(deck); currentRound = 1; lastPlayerToScoop = -1; esunPiles = []; nextEsunPileId = 1; tableCards = [];

    players = []; opponentAreaContainer.innerHTML = ''; playerAreaContainer.innerHTML = '';
    let humanPlayerArea = null; player1HandElement = null; viewScoopedBtn = null;

    gameSettings.playersConfig.forEach((pConfig) => { const player = { ...pConfig, hand: [], scoopedPile: [], score: 0, elementRefs: {} }; players.push(player); const playerElement = createPlayerAreaElement(player, player.isPrimaryHuman); if (player.isPrimaryHuman) { playerAreaContainer.appendChild(playerElement); humanPlayerArea = playerElement; player1HandElement = player.elementRefs.hand; } else { opponentAreaContainer.appendChild(playerElement); } });
    const primaryHumanPlayer = players.find(p => p.isPrimaryHuman); if (!primaryHumanPlayer) { console.error("Config Error: No primary human!"); return; }

    if (player1HandElement) { player1HandElement.removeEventListener('click', handlePlayerHandClick); player1HandElement.addEventListener('click', handlePlayerHandClick); } else { console.error("P1 hand element not found after creation!"); }
    if (viewScoopedBtn) { viewScoopedBtn.removeEventListener('click', toggleIsiwoView); viewScoopedBtn.addEventListener('click', toggleIsiwoView); }

    currentPlayerIndex = players.findIndex(p => p.isPrimaryHuman); if (currentPlayerIndex === -1) currentPlayerIndex = 0;

    tableCards = removeSpecificCards(deck, STARTING_TABLE_CARDS); if (tableCards.length !== STARTING_TABLE_CARDS.length) { alert("Setup Error: Starting cards."); return; }

    selectedPlayerCard = null; currentTurnData = { playedCard: null, potentialScoops: [], selectedScoop: null }; esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null };

    renderGame(); // Render empty state FIRST

    dealCardsAnimated(4, () => { // Deal AFTER initial render
        logMessage("Dealing complete.");
        if (players[currentPlayerIndex]?.isAI) { gameState = 'AITurn'; if (player1HandElement) player1HandElement.removeEventListener('click', handlePlayerHandClick); renderGame(); setTimeout(playAITurn, 500); }
        else { gameState = 'PlayerTurn'; if (player1HandElement && players[currentPlayerIndex]?.isPrimaryHuman) { player1HandElement.removeEventListener('click', handlePlayerHandClick); player1HandElement.addEventListener('click', handlePlayerHandClick); } renderGame(); }
    });

    tablePaletteElement.removeEventListener('click', handleTableClick); tablePaletteElement.addEventListener('click', handleTableClick);
    players.forEach(p => { if (p.elementRefs.toggle) { p.elementRefs.toggle.checked = p.viewMode === 'visual'; } });
}


// --- Attach Event Listeners AFTER DOM is loaded ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Attaching event listeners...");

    if (playCardBtn) { playCardBtn.addEventListener('click', handlePlayCardClick); } else { console.error("playCardBtn not found!"); }
    if (skipScoopBtn) { skipScoopBtn.addEventListener('click', handleSkipScoopClick); } else { console.error("skipScoopBtn not found"); }
    if (confirmScoopBtn) { confirmScoopBtn.addEventListener('click', handleConfirmScoopClick); } else { console.error("confirmScoopBtn not found"); }
    if (buildEsunBtn) { buildEsunBtn.addEventListener('click', handleBuildEsunClick); } else { console.error("buildEsunBtn not found"); }
    if (confirmEsunBuildBtn) { confirmEsunBuildBtn.addEventListener('click', handleConfirmEsunBuildClick); } else { console.error("confirmEsunBuildBtn not found"); }
    if (cancelEsunBuildBtn) { cancelEsunBuildBtn.addEventListener('click', handleCancelEsunBuildClick); } else { console.error("cancelEsunBuildBtn not found"); }
    if (playAgainBtn) { playAgainBtn.addEventListener('click', handlePlayAgain); } else { console.error("playAgainBtn not found"); }
    if (isiwoCloseBtn) { isiwoCloseBtn.addEventListener('click', toggleIsiwoView); } else { console.error("isiwoCloseBtn not found"); }
    if (isiwoModal) { isiwoModal.addEventListener('click', (event) => { if (event.target === isiwoModal) { toggleIsiwoView(); } }); } else { console.error("isiwoModal not found"); }

    if (numPlayersSelect) { numPlayersSelect.addEventListener('change', handleNumPlayersChange); } else { console.error("numPlayersSelect not found"); }
    if (setupForm) { setupForm.addEventListener('submit', handleSetupFormSubmit); } else { console.error("setupForm not found"); }

    if(playerConfigArea && numPlayersSelect) { generatePlayerConfigUI(parseInt(numPlayersSelect.value)); } else { console.error("Setup UI elements missing, cannot generate initial config."); }

}); // End DOMContentLoaded