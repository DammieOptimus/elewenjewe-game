// ==========================================================================
// Elewenjewe Game Script
// Version: Game Flow Refinements + Setup + All Features
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
const gameOverModal = document.getElementById('game-over-modal'); // Game Over Modal
const finalScoresDiv = document.getElementById('final-scores'); // Final scores area
const winnerAnnouncement = document.getElementById('winner-announcement'); // Winner text
const playAgainBtn = document.getElementById('play-again-btn'); // Play Again button

// --- 2. Game Constants & Configuration ---
const SUITS = ["♦", "♣", "♥", "♠"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const STARTING_TABLE_CARDS = ['K♦', 'Q♦', 'J♦', '9♦'];
const CARD_VALUES = { "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 0, "Q": 0, "K": 0, "JOKER": 0 };
const DEFAULT_AI_LEVEL = 'Easy';
let gameSettings = {}; // Populated by setup form

// --- 3. Game State Variables ---
let deck = [];
let players = [];
let tableCards = [];
let esunPiles = [];
let currentPlayerIndex = 0;
let currentRound = 1;
let selectedPlayerCard = null;
let lastPlayerToScoop = -1;
let gameState = 'Setup'; // Initial state
let currentTurnData = { playedCard: null, potentialScoops: [], selectedScoop: null };
let esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null };
let nextEsunPileId = 1;

// --- 4. Core Game Logic Functions ---

function createDeck() {
    const newDeck = [];
    for (const suit of SUITS) { for (const rank of RANKS) { newDeck.push({ id: rank + suit, rank: rank, suit: suit, value: CARD_VALUES[rank], display: rank + suit, isJoker: false }); } }
    if (gameSettings.gameMode === 'Amateur') { newDeck.push({ id: 'JOKER1', rank: 'JOKER', suit: '', value: 0, display: 'Joker', isJoker: true }); newDeck.push({ id: 'JOKER2', rank: 'JOKER', suit: '', value: 0, display: 'Joker', isJoker: true }); }
    return newDeck;
}
function shuffleDeck(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]]; } }
function removeSpecificCards(deckRef, cardsToRemove) { const r = [], d = [], s = new Set(cardsToRemove); for (const c of deckRef) { s.has(c.id) ? r.push(c) : d.push(c); } deckRef.length = 0; deckRef.push(...d); if (r.length !== cardsToRemove.length) console.error("Cannot find starting cards!", cardsToRemove, r); return cardsToRemove.map(id => r.find(c => c.id === id)).filter(Boolean); }
function dealCards(numCards) { let d = 0; for (let i = 0; i < numCards; i++) { for (const p of players) { if (deck.length > 0) { p.hand.push(deck.pop()); d++; } else { if (d > 0 || i === 0) logMessage("Deck empty."); return; } } } }
function findSumSubsets(targetValue, availableCards) { const r = [], n = availableCards.filter(c => c.value > 0 && !c.isJoker); function f(i, s, u) { if (s === targetValue) r.push([...u]); if (i >= n.length || s > targetValue) return; u.push(n[i]); f(i + 1, s + n[i].value, u); u.pop(); f(i + 1, s, u); } if (targetValue > 0 && n.length > 0) f(0, 0, []); return r.filter(s => s.length > 0); }
function checkForScoops(playedCard, currentTableCards, currentEsunPiles) { const nJTC = currentTableCards.filter(c => !c.isJoker); if (playedCard.isJoker) return []; let pS = []; const rM = nJTC.filter(c => c.rank === playedCard.rank); rM.forEach(m => pS.push({ type: 'rank', cardsToScoop: [m] })); if (playedCard.value > 0) { findSumSubsets(playedCard.value, nJTC).forEach(s => pS.push({ type: 'sum', cardsToScoop: s })) } if (gameSettings.allowEsun) { currentEsunPiles.forEach(p => { if (playedCard.rank === p.captureCardRank) pS.push({ type: 'esun', pile: p }) }) } if (gameSettings.ruleset === 'Yorùbá') { pS = pS.filter(s => { if (s.type === 'esun') return true; const c = [playedCard, ...s.cardsToScoop].filter(c => !c.isJoker), r = c.map(c => c.rank), u = new Set(r); return r.length === u.size }) } const cCE = pS.some(s => s.type === 'esun'); if (cCE) { pS = pS.filter(s => s.type === 'esun') } return pS }
function executeScoop(player, playedCard, scoopData) { logMessage(`${player.name} scoops ${scoopData.cardsToScoop.map(c => c.display).join(', ')} w/ ${playedCard.display}`); player.scoopedPile.push(playedCard, ...scoopData.cardsToScoop); const ids = new Set(scoopData.cardsToScoop.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id)); lastPlayerToScoop = players.findIndex(p => p.id === player.id) }

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
        calculateScores(); // Calculate and update total scores
        currentRound++;
        if (currentRound > gameSettings.gameLengthValue) { // --- Game Over ---
            gameState = 'GameOver'; logMessage("--- GAME OVER ---");
            displayGameOver(); // Call function to show modal
            renderGame(); // Render final board state behind modal
            return; // Stop further processing
        } else { // --- Setup Next Round ---
            logMessage(`Starting Round ${currentRound}...`); lastPlayerToScoop = -1; players.forEach(p => p.scoopedPile = []); logMessage("Dealing cards..."); dealCards(4);
            if (players.every(p => p.hand.length === 0)) { logMessage("Deck empty. Ending."); gameState = 'GameOver'; calculateScores(); displayGameOver(); renderGame(); return; } // End if cannot deal
        }
    } else if (handsEmpty && deck.length > 0) { // --- Deal More Cards ---
        logMessage("Hands empty, dealing..."); dealCards(4);
    }

    // --- Advance Turn --- (Only if game not over)
    if (gameState !== 'GameOver') {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length; logMessage(`It's ${players[currentPlayerIndex].name}'s turn.`); selectedPlayerCard = null;
        if (player1HandElement) player1HandElement.removeEventListener('click', handlePlayerHandClick); // Always remove listener first
        if (players[currentPlayerIndex].isAI) {
            gameState = 'AITurn';
            renderGame(); setTimeout(playAITurn, 1000);
        } else {
            gameState = 'PlayerTurn';
            if (players[currentPlayerIndex].isPrimaryHuman && player1HandElement) { // Add listener only for primary human
                player1HandElement.addEventListener('click', handlePlayerHandClick);
            }
            renderGame();
        }
    } else { renderGame(); } // Render final game over state
}

function calculateScores() {
    logMessage("--- Score Update ---");
    players.forEach(player => {
        const roundScore = player.scoopedPile.length;
        player.score += roundScore;
        logMessage(`${player.name}: Scooped ${roundScore} cards (Total Score: ${player.score})`);
    });
}

/**
 * Displays the Game Over modal with final scores and winner.
 */
function displayGameOver() {
    // Find winner(s)
    let highScore = -1;
    players.forEach(p => { if (p.score > highScore) highScore = p.score; });
    const winners = players.filter(p => p.score === highScore);

    // Populate scores table
    let scoreTableHTML = '<table><thead><tr><th>Player</th><th>Final Score</th></tr></thead><tbody>';
    // Sort players by score descending for display
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    sortedPlayers.forEach(p => {
        scoreTableHTML += `<tr><td>${p.name}</td><td>${p.score}</td></tr>`;
    });
    scoreTableHTML += '</tbody></table>';
    finalScoresDiv.innerHTML = scoreTableHTML;

    // Announce winner(s)
    if (winners.length === 1) {
        winnerAnnouncement.textContent = `${winners[0].name} wins!`;
        logMessage(`${winners[0].name} wins with ${winners[0].score} points!`);
    } else {
        winnerAnnouncement.textContent = `It's a tie between ${winners.map(w => w.name).join(' and ')}!`;
        logMessage(`Tie game with ${highScore} points!`);
    }

    // Show the modal
    gameOverModal.classList.add('visible');
}


// --- 5. Rendering Functions ---

function renderCard(card, isHidden = false) { const e = document.createElement('div'); e.classList.add('card'); e.dataset.cardId = card.id; if (isHidden) e.classList.add('hidden'); else if (card.isJoker) { e.classList.add('joker'); e.textContent = 'Joker' } else { const rS = document.createElement('span'); rS.textContent = card.rank; const sS = document.createElement('span'); sS.textContent = card.suit; e.appendChild(rS); e.appendChild(sS); e.style.color = (card.suit === '♦' || card.suit === '♥') ? 'red' : 'black' } return e }
function createPlayerAreaElement(player, isHuman = false) {
    const area = document.createElement('div'); area.classList.add('player-display-area'); area.id = `player-area-${player.id}`; if (isHuman) area.classList.add('human-player-area');
    player.elementRefs = player.elementRefs || {};
    const infoDiv = document.createElement('div'); infoDiv.classList.add('player-info'); infoDiv.id = `info-player-${player.id}`;
    const nameSpan = document.createElement('span'); nameSpan.textContent = player.name; infoDiv.appendChild(nameSpan);
    if (player.isAI) { const tC = document.createElement('div'); tC.classList.add('view-toggle'); const tL = document.createElement('label'); tL.htmlFor = `toggle-view-${player.id}`; tL.textContent = 'Show Cards:'; const tI = document.createElement('input'); tI.type = 'checkbox'; tI.id = `toggle-view-${player.id}`; tI.classList.add('toggle-switch'); tI.dataset.playerId = player.id; tI.checked = player.viewMode === 'visual'; tI.addEventListener('change', handleSingleOpponentViewToggle); tC.appendChild(tL); tC.appendChild(tI); infoDiv.appendChild(tC); player.elementRefs.toggle = tI; }
    area.appendChild(infoDiv);
    const handDiv = document.createElement('div'); handDiv.classList.add('hand'); if (isHuman) handDiv.classList.add('player-hand'); else handDiv.classList.add('opponent-hand'); handDiv.id = `hand-player-${player.id}`; area.appendChild(handDiv); player.elementRefs.hand = handDiv;
    const scoopedInfoDiv = document.createElement('div'); scoopedInfoDiv.classList.add('scooped-info'); const scoopedSpan = document.createElement('span'); scoopedSpan.classList.add('scooped-pile'); scoopedSpan.id = `scooped-player-${player.id}`; scoopedSpan.textContent = 'Scooped: 0'; scoopedInfoDiv.appendChild(scoopedSpan); player.elementRefs.scooped = scoopedSpan;
    if (isHuman) { const iBtn = document.createElement('button'); iBtn.id = 'view-scooped-btn'; iBtn.classList.add('view-pile-btn'); iBtn.style.display = 'none'; iBtn.disabled = true; iBtn.textContent = '(Isíwò)'; scoopedInfoDiv.appendChild(iBtn); viewScoopedBtn = iBtn; /* Assign global ref */ }
    area.appendChild(scoopedInfoDiv);
    return area;
}

/**
 * Renders the entire game state to the UI. Assumes player areas exist.
 */
function renderGame() {
    if (gameState === 'Setup') {
        return; // Don't render game board during setup
    }

    // --- Render Hands for all players ---
    players.forEach(player => {
        const handEl = player.elementRefs.hand;
        if (!handEl) {
            // console.warn(`Hand element not found for player ${player.id}`);
            return; // Skip if element not found
        }

        handEl.innerHTML = ''; // Clear previous cards
        handEl.classList.remove('visual-cards'); // Reset class

        if (player.isAI) {
            // Render AI Hand (Count or Visual Hidden)
            const handSize = player.hand.length;
            if (player.viewMode === 'visual') {
                 handEl.classList.add('visual-cards');
                 if (handSize > 0) {
                     for (let i = 0; i < handSize; i++) {
                         handEl.appendChild(renderCard({ id: `h-${player.id}-${i}`, isJoker: false }, true));
                     }
                 } else {
                     handEl.textContent = 'Hand: 0'; // Still show 0 count if empty
                 }
            } else { // Default 'count' view
                 handEl.textContent = `Hand: ${handSize}`;
            }
        } else { // Human Player Hand (Only primary human interacts, but render for others too if needed)
            player.hand.sort((a, b) => {
                 const suitOrder = ["♦", "♣", "♥", "♠", ""]; // Suit Order + Joker
                 const rankOrder = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"]; // Rank Order
                 if (a.isJoker && !b.isJoker) return 1; // Jokers last
                 if (!a.isJoker && b.isJoker) return -1;
                 if (a.isJoker && b.isJoker) return 0; // Keep joker order stable
                 const suitAIndex = suitOrder.indexOf(a.suit);
                 const suitBIndex = suitOrder.indexOf(b.suit);
                 if (suitAIndex !== suitBIndex) return suitAIndex - suitBIndex; // Sort by suit
                 return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank); // Sort by rank within suit
            });
            player.hand.forEach(card => {
                const cardElement = renderCard(card);
                // Add selected class only if it's the primary human player's turn and they selected this card
                if (gameState === 'PlayerTurn' && selectedPlayerCard && card.id === selectedPlayerCard.id && player.isPrimaryHuman) {
                    cardElement.classList.add('selected');
                }
                handEl.appendChild(cardElement);
            });
        }
    });


    // --- Render Table Area (Esun Piles + Regular Cards) ---
    tablePaletteElement.innerHTML = ''; // Clear table completely
    const renderedElements = {}; // Track rendered elements by ID (card or pile)

    // Render Esun Piles first
    esunPiles.forEach(pile => {
        const pileElement = document.createElement('div');
        pileElement.classList.add('esun-pile', `owner-${pile.ownerId}`);
        pileElement.dataset.esunPileId = pile.id; // Add ID for click handling

        // Highlighting for capturable/selected Esun piles
        let isCapturable = false;
        if (gameState === 'WaitingForScoop' && currentTurnData.playedCard && !currentTurnData.playedCard.isJoker && currentTurnData.potentialScoops.some(s => s.type === 'esun' && s.pile.id === pile.id)) {
             isCapturable = true;
             pileElement.classList.add('potential-scoop-card');
        }
        if (gameState === 'WaitingForScoop' && currentTurnData.selectedScoop && currentTurnData.selectedScoop.type === 'esun' && currentTurnData.selectedScoop.pile.id === pile.id) {
            pileElement.classList.add('selected-for-scoop');
        }

        const cardsContainer = document.createElement('div');
        cardsContainer.classList.add('esun-pile-cards');
        pile.cards.forEach(card => cardsContainer.appendChild(renderCard(card))); // Render small cards
        pileElement.appendChild(cardsContainer);

        const infoElement = document.createElement('div');
        infoElement.classList.add('esun-pile-info');
        const ownerName = players.find(p => p.id === pile.ownerId)?.name || '?'; // Find owner name
        infoElement.textContent = `Owner: ${ownerName.split(' ')[0]} | Needs: ${pile.captureCardRank}`; // Show short name
        pileElement.appendChild(infoElement);

        tablePaletteElement.appendChild(pileElement);
        renderedElements[pile.id] = pileElement; // Track pile element by its ID
    });

    // Render Regular Table Cards
    tableCards.forEach(card => {
        // Don't render cards currently being selected for an Esun build
        if (!(gameState === 'BuildingEsun_SelectTable' && esunBuildData.selectedTableCards.some(s => s.id === card.id))) {
             const cardElement = renderCard(card);
             tablePaletteElement.appendChild(cardElement);
             renderedElements[card.id] = cardElement; // Track card element by its ID
        }
    });

    // --- Highlighting and Temporary Displays ---
    tablePaletteElement.classList.remove('scoop-selection-active', 'esun-building-active'); // Reset classes
    const isWaitingForHumanScoop = gameState === 'WaitingForScoop' && players.length > 0 && players[currentPlayerIndex] && !players[currentPlayerIndex].isAI && players[currentPlayerIndex].isPrimaryHuman;

    if (isWaitingForHumanScoop && currentTurnData.playedCard && !currentTurnData.playedCard.isJoker) {
        tablePaletteElement.classList.add('scoop-selection-active');
        const playedCardElement = renderCard(currentTurnData.playedCard);
        playedCardElement.classList.add('played-for-scoop');
        tablePaletteElement.prepend(playedCardElement); // Show card being played

        // Add potential highlight class to scoopable cards and piles
        currentTurnData.potentialScoops.forEach(scoop => {
            if (scoop.type === 'esun') { // Highlight capturable Esun piles (already done above)
                // if (renderedElements[scoop.pile.id]) renderedElements[scoop.pile.id].classList.add('potential-scoop-card');
            } else { // Highlight scoopable loose cards
                scoop.cardsToScoop.forEach(card => {
                     // Ensure the element exists and is not part of an esun pile visually
                     if (renderedElements[card.id] && !renderedElements[card.id].closest('.esun-pile')) {
                          renderedElements[card.id].classList.add('potential-scoop-card');
                     }
                 });
            }
        });

        // Add selected highlight class to the chosen scoop/capture target
        if (currentTurnData.selectedScoop) {
            if (currentTurnData.selectedScoop.type === 'esun') { // Highlight selected Esun pile (already done above)
                // if (renderedElements[currentTurnData.selectedScoop.pile.id]) renderedElements[currentTurnData.selectedScoop.pile.id].classList.add('selected-for-scoop');
            } else { // Highlight selected loose cards
                 currentTurnData.selectedScoop.cardsToScoop.forEach(card => {
                     if(renderedElements[card.id] && !renderedElements[card.id].closest('.esun-pile')) {
                          renderedElements[card.id].classList.add('selected-for-scoop');
                     }
                 });
            }
        }
    } else if (gameState === 'BuildingEsun_SelectTable' && esunBuildData.cardPlayedForBuild && players.length > 0 && !players[currentPlayerIndex].isAI && players[currentPlayerIndex].isPrimaryHuman) {
        // Esun Build Highlighting
        tablePaletteElement.classList.add('esun-building-active');
        const playedCardElement = renderCard(esunBuildData.cardPlayedForBuild);
        playedCardElement.classList.add('played-for-build');
        tablePaletteElement.prepend(playedCardElement);
        // Highlight cards on table selected for the build
        esunBuildData.selectedTableCards.forEach(card => {
            const existingElement = tablePaletteElement.querySelector(`.card[data-card-id="${card.id}"]`);
            if (existingElement && !existingElement.closest('.esun-pile')) { // Find existing element on table
                existingElement.classList.add('selected-for-esun-build');
            } else { // If it wasn't rendered (e.g. if selection happened fast), render it now as selected
                const cardElement = renderCard(card);
                cardElement.classList.add('selected-for-esun-build');
                tablePaletteElement.appendChild(cardElement);
                // Note: No need to track in renderedElements here as it's temporary
            }
        });
    }

    // --- Update Info Displays ---
    deckCountElement.textContent = `Deck: ${deck.length}`;
    currentPlayerElement.textContent = gameState === 'GameOver' ? 'Game Over' : players.length > 0 && gameState !== 'Initializing' ? `Turn: ${players[currentPlayerIndex]?.name || '?'}` : 'Turn: -';
    roundInfoElement.textContent = `Round: ${currentRound}/${gameSettings.gameLengthValue}`;
    // Update scooped counts for all players using their stored element references
    players.forEach(player => {
        if (player.elementRefs.scooped) {
            player.elementRefs.scooped.textContent = `Scooped (Rnd): ${player.scoopedPile.length} (Total: ${player.score})`;
        }
    });

    // --- Update Button States ---
    const currentActivePlayer = players[currentPlayerIndex];
    const isHumanT = gameState === 'PlayerTurn' && currentActivePlayer && currentActivePlayer.isPrimaryHuman;
    const isWait = gameState === 'WaitingForScoop' && currentActivePlayer && currentActivePlayer.isPrimaryHuman;
    const isBuild = gameState === 'BuildingEsun_SelectTable' && currentActivePlayer && currentActivePlayer.isPrimaryHuman;

    // Debug button state logic
    let calculatedPlayBtnDisabled = !isHumanT || !selectedPlayerCard;
    // console.log(`Render - isHumanT: ${isHumanT}, selectedPlayerCard: ${selectedPlayerCard ? selectedPlayerCard.id : null}, calculatedPlayBtnDisabled: ${calculatedPlayBtnDisabled}`); // DEBUG
    playCardBtn.disabled = calculatedPlayBtnDisabled;

    scoopActionsDiv.style.display = isWait ? 'block' : 'none';
    if (isWait) {
        skipScoopBtn.disabled = false;
        confirmScoopBtn.disabled = !currentTurnData.selectedScoop;
    }
    buildEsunBtn.style.display = gameSettings.allowEsun ? 'block' : 'none';
    buildEsunBtn.disabled = !isHumanT || !selectedPlayerCard || (selectedPlayerCard && selectedPlayerCard.isJoker);
    esunBuildActionsDiv.style.display = isBuild ? 'block' : 'none';
    if (isBuild) {
        confirmEsunBuildBtn.disabled = false;
        cancelEsunBuildBtn.disabled = false;
    }

    // Isiwo button state
    if (viewScoopedBtn) { // Check if button element exists
        const humanP = players.find(p => p.isPrimaryHuman);
        viewScoopedBtn.style.display = gameSettings.allowIsiwo && humanP ? 'inline-block' : 'none'; // Use inline-block
        viewScoopedBtn.disabled = !(humanP && humanP.scoopedPile.length > 0);
    }

    // Disable buttons at Game Over
    if (gameState === 'GameOver') {
        playCardBtn.disabled = true;
        scoopActionsDiv.style.display = 'none';
        buildEsunBtn.disabled = true;
        esunBuildActionsDiv.style.display = 'none';
        if (viewScoopedBtn) {
             viewScoopedBtn.disabled = true;
        }
    }
}

function logMessage(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    gameLogElement.appendChild(logEntry);
    gameLogElement.scrollTop = gameLogElement.scrollHeight;
}


// --- 6. Event Handler Functions ---

function handlePlayerHandClick(event) {
    // console.log("--- handlePlayerHandClick Fired ---"); // DEBUG
    const player = players[currentPlayerIndex];
    if (gameState !== 'PlayerTurn' || !player || !player.isPrimaryHuman) { /* console.log("Ignoring hand click - wrong state/player"); */ return; }
    const clickedElement = event.target.closest('.card'); if (!clickedElement) return;
    const cardId = clickedElement.dataset.cardId;
    const previouslySelected = player1HandElement?.querySelector('.card.selected');
    if (previouslySelected) previouslySelected.classList.remove('selected');
    if (selectedPlayerCard && selectedPlayerCard.id === cardId) { selectedPlayerCard = null; }
    else { selectedPlayerCard = player.hand.find(card => card.id === cardId); if (selectedPlayerCard) clickedElement.classList.add('selected'); }
    // console.log("Updating selectedPlayerCard to:", selectedPlayerCard); // DEBUG
    renderGame();
}

function handlePlayCardClick() {
    // console.log("handlePlayCardClick triggered. Selected Card:", selectedPlayerCard); // DEBUG LINE 1
    const player = players[currentPlayerIndex];
    // console.log("Current Player Object:", player); // DEBUG LINE 3
    if (!selectedPlayerCard || gameState !== 'PlayerTurn' || !player || !player.isPrimaryHuman) { console.log("Play Card condition not met:", { gameState: gameState, selectedPlayerCard: selectedPlayerCard, player: player }); return; } // DEBUG LINE 2 updated
    const playedCard = selectedPlayerCard;
    logMessage(`${player.name} plays ${playedCard.display}.`); player.hand = player.hand.filter(card => card.id !== playedCard.id); selectedPlayerCard = null; playCardBtn.disabled = true;
    if (playedCard.isJoker) { const tS = tableCards.filter(c => !c.isJoker); if (tS.length > 0) { logMessage(`Joker scoops ${tS.length}.`); player.scoopedPile.push(playedCard, ...tS); lastPlayerToScoop = players.findIndex(pl => pl.id === player.id); const ids = new Set(tS.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id)) } else { logMessage("Joker on empty/Joker table."); tableCards.push(playedCard) } endTurnSequence(player) }
    else { const potS = checkForScoops(playedCard, tableCards, esunPiles); if (potS.length > 0) { gameState = 'WaitingForScoop'; currentTurnData = { playedCard: playedCard, potentialScoops: potS, selectedScoop: null }; logMessage("Scoop/Capture possible."); console.log("Potentials:", potS) } else { logMessage("No scoops/captures."); tableCards.push(playedCard); endTurnSequence(player) } }
    renderGame();
}

function handleTableClick(event) {
    const player = players[currentPlayerIndex];
    if (gameState === 'WaitingForScoop' && player?.isPrimaryHuman) { const pE = event.target.closest('.esun-pile'), cE = event.target.closest('.card'); if (pE && pE.classList.contains('potential-scoop-card')) { handleTableEsunCaptureClick(event, pE.dataset.esunPileId) } else if (cE && cE.classList.contains('potential-scoop-card') && !cE.closest('.esun-pile')) { handleTableNormalScoopClick(event, cE) } }
    else if (gameState === 'BuildingEsun_SelectTable' && player?.isPrimaryHuman) { handleTableEsunBuildClick(event) }
}

function handleTableNormalScoopClick(event, clickedCardElement) {
    const clickedCardId = clickedCardElement.dataset.cardId; let newlySelectedScoop = null;
    for (const scoop of currentTurnData.potentialScoops) { if ((scoop.type === 'rank' || scoop.type === 'sum') && scoop.cardsToScoop.some(card => card.id === clickedCardId)) { newlySelectedScoop = scoop; break } }
    if (newlySelectedScoop) { currentTurnData.selectedScoop = (currentTurnData.selectedScoop === newlySelectedScoop) ? null : newlySelectedScoop; logMessage(currentTurnData.selectedScoop ? `Selected: ${newlySelectedScoop.type} ${newlySelectedScoop.cardsToScoop.map(c => c.display).join(',')}` : "Selection cleared."); renderGame(); }
}

function handleTableEsunCaptureClick(event, clickedPileId) {
    let newlySelectedScoop = null;
    for (const scoop of currentTurnData.potentialScoops) { if (scoop.type === 'esun' && scoop.pile.id === clickedPileId) { newlySelectedScoop = scoop; break } }
    if (newlySelectedScoop) { currentTurnData.selectedScoop = (currentTurnData.selectedScoop === newlySelectedScoop) ? null : newlySelectedScoop; logMessage(currentTurnData.selectedScoop ? `Selected Esun capture: ${newlySelectedScoop.pile.id}` : "Esun selection cleared."); renderGame(); }
    else logMessage("Cannot capture clicked pile.");
}

function handleTableEsunBuildClick(event) {
    const clickedElement = event.target.closest('.card'); if (!clickedElement || clickedElement.classList.contains('played-for-build') || clickedElement.closest('.esun-pile')) return;
    const clickedCardId = clickedElement.dataset.cardId; const cardObject = tableCards.find(c => c.id === clickedCardId); if (!cardObject || cardObject.isJoker) { if (cardObject?.isJoker) alert("Cannot add Jokers to Esun pile."); return; }
    const index = esunBuildData.selectedTableCards.findIndex(card => card.id === clickedCardId);
    if (index > -1) { esunBuildData.selectedTableCards.splice(index, 1); } else { esunBuildData.selectedTableCards.push(cardObject); }
    console.log("Esun build selection:", esunBuildData.selectedTableCards.map(c => c.display)); renderGame();
}

function handleSkipScoopClick() {
    const player = players[currentPlayerIndex]; if (gameState !== 'WaitingForScoop' || !player || !player.isPrimaryHuman) return;
    const playedCard = currentTurnData.playedCard; logMessage(`${player.name} skips scoop/capture.`); tableCards.push(playedCard); endTurnSequence(player);
}

function handleConfirmScoopClick() {
    const player = players[currentPlayerIndex]; if (gameState !== 'WaitingForScoop' || !currentTurnData.selectedScoop || !player || !player.isPrimaryHuman) return;
    const playedCard = currentTurnData.playedCard; const chosenScoop = currentTurnData.selectedScoop;
    if (chosenScoop.type === 'esun') { const pile = chosenScoop.pile; logMessage(`${player.name} captures Esun ${pile.id}.`); player.scoopedPile.push(playedCard, ...pile.cards); esunPiles = esunPiles.filter(p => p.id !== pile.id); lastPlayerToScoop = players.findIndex(pl => pl.id === player.id) }
    else { executeScoop(player, playedCard, chosenScoop) }
    endTurnSequence(player);
}

function handleBuildEsunClick() {
    const player = players[currentPlayerIndex]; if (!selectedPlayerCard || gameState !== 'PlayerTurn' || !player || !player.isPrimaryHuman || !gameSettings.allowEsun || selectedPlayerCard.isJoker) { if (selectedPlayerCard && selectedPlayerCard.isJoker) alert("Cannot build Esun with Joker."); return }
    const buildCard = selectedPlayerCard; const captureCard = player.hand.find(card => card.rank === buildCard.rank && card.id !== buildCard.id && !card.isJoker); if (!captureCard) { alert(`Need another ${buildCard.rank} (non-Joker) in hand.`); return }
    gameState = 'BuildingEsun_SelectTable'; esunBuildData = { cardPlayedForBuild: buildCard, selectedTableCards: [], requiredCaptureCard: captureCard }; logMessage(`Building Esun with ${buildCard.display}. Select table cards?`); console.log("Esun build state. Require:", captureCard.id); renderGame();
}

function handleConfirmEsunBuildClick() {
    const player = players[currentPlayerIndex]; if (gameState !== 'BuildingEsun_SelectTable' || !player || !player.isPrimaryHuman) return;
    const buildCard = esunBuildData.cardPlayedForBuild; const tS = esunBuildData.selectedTableCards; const cR = buildCard.rank; const pileCards = [buildCard, ...tS].filter(c => !c.isJoker); let valid = true;
    if (gameSettings.ruleset === 'Yorùbá') { const r = pileCards.map(c => c.rank), u = new Set(r); if (r.length !== u.size) { alert("Yorùbá Esun Block: Pile duplicates."); valid = false; } if (valid && r.includes(cR)) { alert(`Yorùbá Esun Block: Capture rank ${cR} in pile.`); valid = false; } }
    if (!valid) return;
    const nP = { id: `esun-${nextEsunPileId++}`, ownerId: player.id, cards: pileCards, captureCardRank: cR }; esunPiles.push(nP); logMessage(`${player.name} built Esun (${pileCards.map(c => c.display).join(', ')}). Needs ${cR}.`); console.log("Built Esun:", nP);
    player.hand = player.hand.filter(c => c.id !== buildCard.id); const ids = new Set(tS.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id));
    selectedPlayerCard = null; endTurnSequence(player);
}

function handleCancelEsunBuildClick() {
    const player = players[currentPlayerIndex]; if (gameState !== 'BuildingEsun_SelectTable' || !player || !player.isPrimaryHuman) return;
    logMessage("Esun build cancelled."); gameState = 'PlayerTurn'; esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null }; renderGame();
}

function handleSingleOpponentViewToggle(event) {
    const toggle = event.target; const playerId = parseInt(toggle.dataset.playerId); const player = players.find(p => p.id === playerId);
    if (player && player.isAI) { player.viewMode = toggle.checked ? 'visual' : 'count'; console.log(`Player ${playerId} view mode set to: ${player.viewMode}`); renderGame(); }
    else { console.warn(`Could not find AI player with ID ${playerId} for view toggle.`); }
}

function toggleIsiwoView() {
    // console.log("toggleIsiwoView called");
    if (!gameSettings.allowIsiwo) return;
    const player = players.find(p => p.isPrimaryHuman); if (!player) return;
    const isVisible = isiwoModal.classList.contains('visible');
    // console.log(`Modal currently visible: ${isVisible}`);
    if (isVisible) { /* console.log("Hiding Isiwo modal.");*/ isiwoModal.classList.remove('visible'); }
    else {
        if (player.scoopedPile.length === 0) { logMessage("No cards in scooped pile to view yet."); return; }
        // console.log("Showing Isiwo modal.");
        isiwoCardsDisplay.innerHTML = '';
        const sortedPile = [...player.scoopedPile].sort((a, b) => { const suitOrder = ["♦", "♣", "♥", "♠", ""], rankOrder = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"]; if (a.isJoker && !b.isJoker) return 1; if (!a.isJoker && b.isJoker) return -1; if (a.isJoker && b.isJoker) return 0; const suitAIndex = suitOrder.indexOf(a.suit), suitBIndex = suitOrder.indexOf(b.suit); if (suitAIndex !== suitBIndex) { return suitAIndex - suitBIndex; } return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank); });
        sortedPile.forEach(card => { isiwoCardsDisplay.appendChild(renderCard(card)); });
        isiwoModal.classList.add('visible');
    }
}

function handlePlayAgain() {
    gameOverModal.classList.remove('visible'); // Hide Game Over modal
    gameContainer.style.display = 'none'; // Hide Game container
    setupModal.classList.add('visible'); // Show Setup modal
    gameState = 'Setup'; // Reset state
    gameLogElement.innerHTML = 'Welcome! Configure your game.<br>'; // Clear log
    generatePlayerConfigUI(parseInt(numPlayersSelect.value)); // Reset setup UI
}


// --- 7. AI Logic ---

function getAIEasyPlay(aiPlayer) {
    if (aiPlayer.hand.length === 0) return null;
    const cardToPlay = aiPlayer.hand[0]; // Always play first card
    let play = { card: cardToPlay, scoop: null, esunCapture: null, isJokerPlay: cardToPlay.isJoker, esunBuild: null, value: 0 };
    if (!cardToPlay.isJoker) {
        const potentialActions = checkForScoops(cardToPlay, tableCards, esunPiles);
        if (potentialActions.length > 0) {
            play.esunCapture = potentialActions.find(a => a.type === 'esun');
            if (!play.esunCapture) { play.scoop = potentialActions[0]; } // Take first normal scoop if no capture
        }
    } else { play.value = tableCards.filter(c => !c.isJoker).length + 1; }
    return play;
}

function getAIMediumPlay(aiPlayer) {
    let bestPlay = { card: null, scoop: null, esunCapture: null, esunBuild: null, value: -1, isJokerPlay: false };
    const JOKER_THRESHOLD = 2; const playableJoker = aiPlayer.hand.find(c => c.isJoker); const clearableTableCards = tableCards.filter(c => !c.isJoker);
    // 1. Evaluate Esun Capture
    if (gameSettings.allowEsun) { for (const card of aiPlayer.hand) { if (card.isJoker) continue; const actions = checkForScoops(card, tableCards, esunPiles); const capture = actions.find(s => s.type === 'esun'); if (capture) { let v = capture.pile.cards.length + 1 + (capture.pile.ownerId !== aiPlayer.id ? 3 : 0); if (v > bestPlay.value) { bestPlay = { card: card, esunCapture: capture, value: v }; } } } if (bestPlay.esunCapture) return bestPlay; }
    bestPlay = { card: null, scoop: null, esunCapture: null, esunBuild: null, value: -1, isJokerPlay: false }; // Reset if no capture
    // 2. Evaluate Joker Play
    if (playableJoker && clearableTableCards.length >= JOKER_THRESHOLD) { let v = clearableTableCards.length + 1; bestPlay = { card: playableJoker, value: v, isJokerPlay: true }; }
    // 3. Evaluate Normal Scoops
    for (const card of aiPlayer.hand) { if (card.isJoker) continue; const actions = checkForScoops(card, tableCards, esunPiles); const normalScoops = actions.filter(s => s.type === 'rank' || s.type === 'sum'); if (normalScoops.length > 0) { let bS = normalScoops.reduce((b, c) => (c.cardsToScoop.length > b.cardsToScoop.length) ? c : b, normalScoops[0]); let v = bS.cardsToScoop.length + 1; if (v > bestPlay.value) { bestPlay = { card: card, scoop: bS, value: v, isJokerPlay: false }; } } }
    // 4. TODO: Evaluate Building Esun
    // 5. Fallback
    if (!bestPlay.card) { bestPlay.card = aiPlayer.hand.find(c => !c.isJoker) || aiPlayer.hand[0]; bestPlay.isJokerPlay = bestPlay.card.isJoker; if (!bestPlay.isJokerPlay) { const fa = checkForScoops(bestPlay.card, tableCards, esunPiles); bestPlay.scoop = fa.find(s => s.type === 'rank' || s.type === 'sum'); } }
    return bestPlay;
}

function getAIHardPlay(aiPlayer) {
    let bestPlay = { card: null, scoop: null, esunCapture: null, esunBuild: null, value: -1, isJokerPlay: false };
    const JOKER_THRESHOLD = 3; const playableJoker = aiPlayer.hand.find(c => c.isJoker); const clearableTableCards = tableCards.filter(c => !c.isJoker);
    const possiblePlays = [];
    // Evaluate non-Joker plays first
    for (const card of aiPlayer.hand) { if (card.isJoker) continue;
        const actions = checkForScoops(card, tableCards, esunPiles);
        const capture = actions.find(s => s.type === 'esun');
        if (capture) { let v = 100 + capture.pile.cards.length + (capture.pile.ownerId !== aiPlayer.id ? 50 : 0); possiblePlays.push({ card: card, action: capture, value: v }); continue; } // Capture is exclusive
        const scoops = actions.filter(s => s.type === 'rank' || s.type === 'sum'); let currentPlay = null;
        if (scoops.length > 0) { let bestScoop = scoops.reduce((b, c) => (c.cardsToScoop.length > b.cardsToScoop.length) ? c : b, scoops[0]); let v = 10 + bestScoop.cardsToScoop.length; currentPlay = { card: card, action: bestScoop, value: v }; }
        // TODO: Evaluate Esun Build value here
        const canBuild = gameSettings.allowEsun && !card.isJoker && aiPlayer.hand.some(c => c.rank === card.rank && c.id !== card.id && !c.isJoker);
        if (canBuild) { let buildValue = 5; /* Add more sophisticated build value calc */ if (!currentPlay || buildValue > currentPlay.value) { currentPlay = { card: card, action: { type: 'build' }, value: buildValue }; } }
        // If no action, it's play_only
        if (!currentPlay) { currentPlay = { card: card, action: { type: 'play_only' }, value: 1 }; /* TODO: Defensive value */ }
        possiblePlays.push(currentPlay);
    }
    // Evaluate Joker
    if (playableJoker) { let jokerValue = 0; if (clearableTableCards.length >= JOKER_THRESHOLD) { jokerValue = 50 + clearableTableCards.length; } else if (clearableTableCards.length > 0) { jokerValue = 5 + clearableTableCards.length; } possiblePlays.push({ card: playableJoker, action: { type: 'joker' }, value: jokerValue, isJokerPlay: true }); }
    // Choose best
    if (possiblePlays.length > 0) { possiblePlays.sort((a, b) => b.value - a.value); let chosenData = possiblePlays[0]; bestPlay = { card: chosenData.card, scoop: chosenData.action?.type === 'rank' || chosenData.action?.type === 'sum' ? chosenData.action : null, esunCapture: chosenData.action?.type === 'esun' ? chosenData.action : null, esunBuild: chosenData.action?.type === 'build' ? chosenData.action : null, value: chosenData.value, isJokerPlay: !!chosenData.isJokerPlay }; }
    else if (aiPlayer.hand.length > 0) { bestPlay.card = aiPlayer.hand[0]; bestPlay.isJokerPlay = bestPlay.card.isJoker; logMessage("AI Hard failsafe: Playing first card."); }
    return bestPlay;
}

function playAITurn() {
    if (gameState !== 'AITurn') return;
    const aiPlayer = players[currentPlayerIndex]; logMessage(`${aiPlayer.name}'s turn (AI ${aiPlayer.aiLevel || 'Default'})...`);
    if (!aiPlayer || aiPlayer.hand.length === 0) { logMessage(`${aiPlayer.name} no cards.`); endTurnSequence(aiPlayer); return; }
    let chosenPlay = null;
    switch (aiPlayer.aiLevel) { case 'Hard': chosenPlay = getAIHardPlay(aiPlayer); break; case 'Medium': chosenPlay = getAIMediumPlay(aiPlayer); break; case 'Easy': default: chosenPlay = getAIEasyPlay(aiPlayer); break; }
    if (!chosenPlay || !chosenPlay.card) { logMessage(`Error: AI (${aiPlayer.aiLevel}) could not determine play.`); if (aiPlayer.hand.length > 0) { chosenPlay = { card: aiPlayer.hand[0], isJokerPlay: aiPlayer.hand[0].isJoker }; logMessage(`AI playing failsafe: ${chosenPlay.card.display}`); } else { endTurnSequence(aiPlayer); return; } }
    const cardToPlay = chosenPlay.card; logMessage(`${aiPlayer.name} plays ${cardToPlay.display}.`); aiPlayer.hand = aiPlayer.hand.filter(c => c.id !== cardToPlay.id);
    if (chosenPlay.esunCapture) { const p = chosenPlay.esunCapture.pile; logMessage(`${aiPlayer.name} captures Esun ${p.id}.`); aiPlayer.scoopedPile.push(cardToPlay, ...p.cards); esunPiles = esunPiles.filter(ep => ep.id !== p.id); lastPlayerToScoop = currentPlayerIndex; }
    else if (chosenPlay.isJokerPlay) { const s = tableCards.filter(c => !c.isJoker); if (s.length > 0) { logMessage(`Joker scoops ${s.length}.`); aiPlayer.scoopedPile.push(cardToPlay, ...s); lastPlayerToScoop = currentPlayerIndex; const ids = new Set(s.map(c => c.id)); tableCards = tableCards.filter(c => !ids.has(c.id)); } else { logMessage("AI Joker scoops nothing."); tableCards.push(cardToPlay); } }
    else if (chosenPlay.scoop) { logMessage(`${aiPlayer.name} scoops.`); executeScoop(aiPlayer, cardToPlay, chosenPlay.scoop); }
    else if (chosenPlay.esunBuild) { logMessage(`${aiPlayer.name} builds an Esun pile (AI logic TBD).`); tableCards.push(cardToPlay); } // Placeholder action
    else { logMessage(`${aiPlayer.name} cannot scoop or capture.`); tableCards.push(cardToPlay); }
    endTurnSequence(aiPlayer);
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
    let humanPlayerArea = null; player1HandElement = null; viewScoopedBtn = null; // Reset refs

    gameSettings.playersConfig.forEach((pConfig) => { const player = { ...pConfig, hand: [], scoopedPile: [], score: 0, elementRefs: {} }; players.push(player); const playerElement = createPlayerAreaElement(player, player.isPrimaryHuman); if (player.isPrimaryHuman) { playerAreaContainer.appendChild(playerElement); humanPlayerArea = playerElement; player1HandElement = player.elementRefs.hand; /* viewScoopedBtn assigned in createEl */ } else { opponentAreaContainer.appendChild(playerElement); } });
    const primaryHumanPlayer = players.find(p => p.isPrimaryHuman); if (!primaryHumanPlayer) { console.error("Config Error: No primary human!"); return; }

    // Add player hand listener AFTER element is created and assigned
    if (player1HandElement) { player1HandElement.removeEventListener('click', handlePlayerHandClick); player1HandElement.addEventListener('click', handlePlayerHandClick); }
    else { console.error("P1 hand element not found after creation!"); }
    // Add Isiwo listener if button exists
    if (viewScoopedBtn) { viewScoopedBtn.removeEventListener('click', toggleIsiwoView); viewScoopedBtn.addEventListener('click', toggleIsiwoView); }

    currentPlayerIndex = players.findIndex(p => p.isPrimaryHuman); if (currentPlayerIndex === -1) currentPlayerIndex = 0; // Start human or P1

    tableCards = removeSpecificCards(deck, STARTING_TABLE_CARDS); if (tableCards.length !== STARTING_TABLE_CARDS.length) { alert("Setup Error: Starting cards."); return; }
    dealCards(4);
    selectedPlayerCard = null; currentTurnData = { playedCard: null, potentialScoops: [], selectedScoop: null }; esunBuildData = { cardPlayedForBuild: null, selectedTableCards: [], requiredCaptureCard: null };

    if (players[currentPlayerIndex]?.isAI) { gameState = 'AITurn'; } else { gameState = 'PlayerTurn'; } // Use optional chaining
    logMessage(`Game ready. R ${currentRound}. ${players[currentPlayerIndex]?.name || '?'}'s turn.`);
    renderGame();

    // Remove human listener if AI starts
    if (gameState === 'AITurn' && player1HandElement) { player1HandElement.removeEventListener('click', handlePlayerHandClick); }

    // Ensure table listener is active
    tablePaletteElement.removeEventListener('click', handleTableClick); tablePaletteElement.addEventListener('click', handleTableClick);
    players.forEach(p => { if (p.elementRefs.toggle) { p.elementRefs.toggle.checked = p.viewMode === 'visual'; } }); // Sync toggles

    if (gameState === 'AITurn') { setTimeout(playAITurn, 500); }
}


// --- Attach Event Listeners AFTER DOM is loaded ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Attaching event listeners..."); // DEBUG

    // Verify button exists before adding listener
    if (playCardBtn) { playCardBtn.addEventListener('click', handlePlayCardClick); /* console.log("Attached listener to playCardBtn"); */ } else { console.error("playCardBtn not found!"); }
    if (skipScoopBtn) { skipScoopBtn.addEventListener('click', handleSkipScoopClick); } else { console.error("skipScoopBtn not found"); }
    if (confirmScoopBtn) { confirmScoopBtn.addEventListener('click', handleConfirmScoopClick); } else { console.error("confirmScoopBtn not found"); }
    if (buildEsunBtn) { buildEsunBtn.addEventListener('click', handleBuildEsunClick); } else { console.error("buildEsunBtn not found"); }
    if (confirmEsunBuildBtn) { confirmEsunBuildBtn.addEventListener('click', handleConfirmEsunBuildClick); } else { console.error("confirmEsunBuildBtn not found"); }
    if (cancelEsunBuildBtn) { cancelEsunBuildBtn.addEventListener('click', handleCancelEsunBuildClick); } else { console.error("cancelEsunBuildBtn not found"); }
    if (playAgainBtn) { playAgainBtn.addEventListener('click', handlePlayAgain); } else { console.error("playAgainBtn not found"); } // Listener for Play Again
    if (isiwoCloseBtn) { isiwoCloseBtn.addEventListener('click', toggleIsiwoView); } else { console.error("isiwoCloseBtn not found"); }
    if (isiwoModal) { isiwoModal.addEventListener('click', (event) => { if (event.target === isiwoModal) { toggleIsiwoView(); } }); } else { console.error("isiwoModal not found"); }

    // --- Attach Setup Listeners ---
    if (numPlayersSelect) { numPlayersSelect.addEventListener('change', handleNumPlayersChange); } else { console.error("numPlayersSelect not found"); }
    if (setupForm) { setupForm.addEventListener('submit', handleSetupFormSubmit); } else { console.error("setupForm not found"); }

    // --- Initial UI Setup (Run only once after DOM loaded) ---
    if(playerConfigArea && numPlayersSelect) { generatePlayerConfigUI(parseInt(numPlayersSelect.value)); } else { console.error("Setup UI elements missing, cannot generate initial config."); }
    // Game starts via form submission

}); // End DOMContentLoaded