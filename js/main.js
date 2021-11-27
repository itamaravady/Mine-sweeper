'use strict'

//consts
const MINE = `<img src="img/BOMB1.png">`;
const DISARMED = `<img src="img/DISARMED.png">`;
const FLAG = '<img src="img/grassFlag.png">';
const NOT_CLICKED = '<img src="img/grass.png">';
const EMPTY = '<img src="img/empty.png">';
const SAFE = '<img src="img/safe.png">';
const SMILEY = '🙂';
const FEAR_SMILEY = '😮';
const WIN_SMILEY = '😎';
const LOSE_SMILEY = '😵';


//globals----------------------------------
var gBoard = [];
var gBoardSnapshots = [];
var gLevel = {
    SIZE: 4,
    MINES: 2,
    MODIFIED_MINES: 0
};
var gGame = {
    isOn: true,
    isLost: false,
    isfirstClick: true,
    shownCount: 0,
    markedCount: 0,
    disarmedCount: 0
}

var gStartTime;
var gIntervalId;
var gIntervalId;
var gIsShowFear = false;
var gLivesCount = 3;
var gHintsCount = 3;
var gSafesCount = 3;
var gIsShowHint = false;
var gIsHintInProgress = false;
var gSnapshotIdx = 0;
var gIsManualMode = false;
var gPlacingMines = false;
var gManualMinesCount;
var gIsSvnBoom = false;
//--------------------------------------


//initializing game functions----------------------------------------
function initGame() {
    gBoard = buildBoard();
    resetGame();
    showBestScore();
}


// Builds the board, Set mines at random locations, Call setMinesNegsCount(), Return the created board
function buildBoard() {
    var board = [];
    for (var i = 0; i < gLevel.SIZE; i++) {
        board.push([])
        for (var j = 0; j < gLevel.SIZE; j++) {
            board[i][j] = {
                minesAroundCount: 1,
                isShown: false,
                isMine: false,
                //-1 not a mine, 0 not disarmed, 1 disarmed:
                isDisarmed: -1,
                isMarked: false,
                isHint: false
            }
        }
    }
    return board;
}


function resetGame() {
    gGame.isOn = false;
    gGame.isLost = false;
    gGame.isfirstClick = true;
    gLivesCount = 3;
    gHintsCount = 3;
    gSafesCount = 3;
    gGame.shownCount = 0;
    gGame.markedCount = 0;
    gGame.disarmedCount = 0;
    gIsShowFear = true;
    gIsManualMode = false;
    gManualMinesCount = 0;
    gPlacingMines = false;
    gBoardSnapshots = [];
    gSnapshotIdx = 0;
    gIsSvnBoom = false;
    clearInterval(gIntervalId);

    resetBtnAndStats();

    renderBoard(gBoard);
    //disanimate undo button
    toggleUndoBtn(false);
}

//---------------------------------------------------------------------------------


//mines placing--------------------------------------------------------------------

function placeMinesRandomly(iStartIdx, jStartIdx) {
    var noMineCells = getNoMineCells(gBoard, iStartIdx, jStartIdx);
    for (var i = 0; i < gLevel.MINES; i++) {
        var idx = getRandomInt(0, noMineCells.length);
        var cell = noMineCells[idx];
        noMineCells.splice(idx, 1);
        gBoard[cell.i][cell.j].isMine = true;
        gBoard[cell.i][cell.j].isDisarmed = 0;
    }
}

function placeMinesManualy(cell) {
    cell.isMine = true;
    cell.isShown = true;
    cell.isDisarmed = 0;
    gManualMinesCount++;
    renderBoard(gBoard);

    if (gManualMinesCount === gLevel.MINES) {
        gPlacingMines = false;
        hideAllMines();
        document.querySelector('.manualMinesBtn').classList.remove('active');
        renderBoard(gBoard);
    }
}


function getNoMineCells(board, iStartIdx, jStartIdx) {
    var noMineCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board.length; j++) {
            //turn the board to an 1D array, excluding starting cell clicked 
            if (i !== iStartIdx && j !== jStartIdx) noMineCells.push({ i, j });
        }
    }
    return noMineCells
}


function placeMinesSvnBoom() {
    var countIdx = 0;
    var countSvn = 0;
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard.length; j++) {
            var currCell = gBoard[i][j];
            var isSvn = (!(countIdx % 7) || countIdx % 10 === 7)
            if (isSvn) {
                currCell.isMine = true;
                currCell.isDisarmed = 0;
                countSvn++;
            }
            countIdx++;
        }
    }
    return countSvn;
}


//----------------------------------------------------------------------------

//Render the board as a <table> to the page
function renderBoard(board) {
    var strHTML = '<table border="0"><tbody>';
    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>';
        for (var j = 0; j < board.length; j++) {
            var cellContent;
            var currCell = board[i][j];
            //handle disarmed cell
            if (currCell.isDisarmed === 1) cellContent = DISARMED;
            //handle shown/hint cell
            else if (currCell.isShown || currCell.isHint) {
                if (currCell.isMine) cellContent = MINE;
                else if (currCell.minesAroundCount) cellContent = `<span class="negs">${currCell.minesAroundCount}</span> ${EMPTY}`;
                else cellContent = EMPTY;
                //handle not shown cell
            } else {
                if (currCell.isMarked) cellContent = FLAG;
                else if (gGame.isLost && currCell.isMine) cellContent = MINE;
                else cellContent = NOT_CLICKED;
            }
            strHTML += getImgHTMLStr(i, j, cellContent);
        }
        strHTML += '</tr>';
    }
    strHTML += '</tbody></table>';
    var elBoard = document.querySelector('.minesBoard');
    elBoard.innerHTML = strHTML;
}





//count Mine neighbours
function countNegs(cellI, cellJ, mat) {
    var negsCount = 0;
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i > mat.length - 1) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j > mat[i].length - 1) continue;
            if (i === cellI && j === cellJ) continue;

            if (mat[i][j].isMine) negsCount++;// might need a change
        }
    }
    return negsCount;
}


//count mines around each cell and sets the cell's minesAroundCount value
function setMinesNegsCount(board) {
    for (var i = 0; i < board.length; i++) {
        var currRow = board[i];
        for (var j = 0; j < board.length; j++) {
            var currCell = currRow[j];
            currCell.minesAroundCount = countNegs(i, j, board);
        }
    }

}


//Called when a cell (td) is clicked
function cellClicked(elCell, i, j, isRightBtn) {
    if (gIsHintInProgress) return;
    //animate smiley on every click
    if (gIsShowFear) showFearSmiley();
    //handle hint click. prevent hint on first click. prevent click if no hints
    if (gIsShowHint && gHintsCount && gSnapshotIdx) {
        showHint(i, j);
        return;
    }
    //cell already shown
    var cell = gBoard[i][j];
    if (cell.isShown) return;

    //manualy place mines
    if (gPlacingMines) {
        placeMinesManualy(cell);
        return;
    }

    //handle first click
    if (gGame.isfirstClick) {
        gGame.isOn = true;
        gGame.isfirstClick = false;
        document.querySelector('.hintBtn').classList.add('active');
        document.querySelector('.safeBtn').classList.add('active');
        document.querySelector('.manualMinesBtn').classList.remove('active');
        document.querySelector('.svnBoomBtn').classList.remove('active');

        //decide on placing mines
        if (gIsSvnBoom) {
            gLevel.MODIFIED_MINES = placeMinesSvnBoom();
        }
        else if (!gIsManualMode) placeMinesRandomly(i, j);
        //update MOD
        setMinesNegsCount(gBoard);
        //start game time
        startTimeInterval();
    }
    //dont click if game is not on
    if (!gGame.isOn) return;

    if (cell.isDisarmed === 1) return;

    //Mark/unmark if right button is clicked
    if (isRightBtn) {
        markCell(i, j);
        pushToUndoBoard(gBoard);
        renderBoard(gBoard);
        return;
    }
    //prevent clicking flag
    if (cell.isMarked) return;
    //mine is clicked
    if (cell.isMine) {
        //check if decrease life or lose
        gGame.isLost = checkGameLost(cell);
        pushToUndoBoard(gBoard);
        renderBoard(gBoard);
        if (checkGameOver()) winGame();
        return;
    }
    //handle single number situation
    if (cell.minesAroundCount > 0) {
        elCell.innerText = cell.minesAroundCount;
        cell.isShown = true;
        gGame.shownCount++;
    } else {
        //handle empty cell situation
        expandShown(gBoard, i, j);
    }
    pushToUndoBoard(gBoard);
    renderBoard(gBoard);

    if (checkGameOver()) winGame();
}


//flag a cell
function markCell(i, j) {
    var cell = gBoard[i][j];
    if (cell.isMarked) {
        cell.isMarked = false;
        gGame.markedCount--;
        return;
    }
    cell.isMarked = true;
    gGame.markedCount++;
    if (checkGameOver()) winGame();
    return;
}





//When user clicks a cell with no mines around, cell+negs open
function expandShown(board, cellI, cellJ) {
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i > board.length - 1) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j > board.length - 1) continue;
            var currCell = board[i][j];
            // if (i === cellI && j === cellJ) continue;
            if (!currCell.isShown && !currCell.isMarked && currCell.isDisarmed === -1) {
                gGame.shownCount++;
                currCell.isShown = true;
                // bonus recursion
                if (!currCell.minesAroundCount) expandShown(board, i, j);
            }
        }
    }
}


function getImgHTMLStr(i, j, cellContent) {
    var className = `cell cell${i}-${j}`;
    var imgHTMLStr = `<td class="${className}" oncontextmenu="return false;" onmousedown="whichMouseBtn(this,${i},${j},event)">
    ${cellContent}
    </td>`;
    return imgHTMLStr;
}


//Game ends when all mines are marked, and all the other cells are shown.
function checkGameOver() {
    if (gIsSvnBoom) var minesOnBoard = gLevel.MODIFIED_MINES;
    else var minesOnBoard = gLevel.MINES;
    var shownPlusMarked = gGame.markedCount + gGame.shownCount;
    var disarmedPlusMarked = gGame.disarmedCount + gGame.markedCount;
    if (shownPlusMarked === gLevel.SIZE ** 2 && disarmedPlusMarked === minesOnBoard) return true;
    return false;
}


function checkGameLost(cell) {

    if (!gLivesCount) {
        //no lives left
        clearInterval(gIntervalId);
        gGame.isLost = true;
        gGame.isOn = false;
        gIsShowFear = false;
        document.querySelector('.smiley').innerText = LOSE_SMILEY;
        toggleUndoBtn(false);
        return true;
    }
    //more lives left
    gLivesCount--;
    document.querySelector('.lives').innerText = `Lives: ${gLivesCount}`;
    cell.isDisarmed = 1;
    cell.isShown = true;
    gGame.shownCount++;
    gGame.disarmedCount++;
    return false;
}
function winGame() {
    clearInterval(gIntervalId);
    updateBestScore();
    showBestScore();
    gGame.isOn = false;
    gIsShowFear = false;
    document.querySelector('.smiley').innerText = WIN_SMILEY;
    toggleUndoBtn(false);
}

function updateLevel(size, mines) {
    gLevel.SIZE = size;
    gLevel.MINES = mines;
    initGame();
}

//I just had to
function showFearSmiley() {
    var elSmiley = document.querySelector('.smiley');
    elSmiley.innerText = FEAR_SMILEY;
    setTimeout(() => {
        if (!gIsShowFear) return;
        elSmiley.innerText = SMILEY;
    }, 200, elSmiley);
}

function undoStep() {
    if (!gGame.isOn) return;
    //can undo only after second move
    if (gSnapshotIdx < 2) return;
    var lastSnapshot = gBoardSnapshots[gSnapshotIdx - 2];
    console.log(lastSnapshot);
    gSnapshotIdx--;
    var newGame = copyObj(lastSnapshot.game);
    gGame = newGame;
    gBoard = copyMat(lastSnapshot.board);
    renderBoard(gBoard);
    if (gSnapshotIdx === 1) {
        toggleUndoBtn(false);
    }
}

function pushToUndoBoard() {
    var newBoard = copyMat(gBoard);
    var newGame = copyObj(gGame);
    var snapshot = {
        board: newBoard,
        game: newGame
    }
    gBoardSnapshots.splice(gSnapshotIdx++, 1, snapshot);
    if (gSnapshotIdx === 2) {
        toggleUndoBtn(true);
    }
}

function toggleUndoBtn(isAdd) {
    var elUndo = document.querySelector('.undo');
    if (isAdd) {
        elUndo.classList.add('active');
    } else {
        elUndo.classList.remove('active');
    }
}


function updateBestScore() {
    var currLvl = gLevel.SIZE;
    switch (currLvl) {
        case 4:
            var bestTime = localStorage.getItem('beginner');
            var currTime = +document.querySelector('.currTime').innerText;
            if (currTime < bestTime || bestTime === null) localStorage.setItem("beginner", currTime);
            break;
        case 8:
            var bestTime = localStorage.getItem('medium');
            var elCurrTime = +document.querySelector('.currTime');
            if (currTime < bestTime || bestTime === null) localStorage.setItem("medium", currTime);
            break;
        case 12:
            var bestTime = localStorage.getItem('expert');
            var elCurrTime = +document.querySelector('.currTime');
            if (currTime < bestTime || bestTime === null) localStorage.setItem("expert", currTime);
            break;
    }
}

function showBestScore() {
    var elBestTime = document.querySelector('.bestTime');
    var currLvl = gLevel.SIZE;
    switch (currLvl) {
        case 4:
            elBestTime.innerText = localStorage.getItem('beginner');
            break;
        case 8:
            elBestTime.innerText = localStorage.getItem('medium');
            break;
        case 12:
            elBestTime.innerText = localStorage.getItem('expert');
            break;
    }
}


function showHint(cellI, cellJ) {
    gIsHintInProgress = true;
    gHintsCount--;
    document.querySelector('.hintBtn span').innerText = gHintsCount;
    if (!gHintsCount) document.querySelector('.hintBtn').classList.remove('active');
    toggleShowHintCells(cellI, cellJ);
    renderBoard(gBoard);
    var hintTimeout = setTimeout(() => {
        toggleShowHintCells(cellI, cellJ);
        renderBoard(gBoard);
        gIsHintInProgress = false;
    }, 1000, cellI, cellJ, hintTimeout);
}

function toggleShowHintCells(cellI, cellJ) {
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j > gBoard.length - 1) continue;
            var currCell = gBoard[i][j];
            if (currCell.isShown || currCell.isMarked) continue;
            //show or hide hint
            if (gIsShowHint) currCell.isHint = true;
            else currCell.isHint = false;
        }
    }
    gIsShowHint = false;
}

function safeClick() {
    gSafesCount--;
    var safeCells = getSafeCells(gBoard);
    var elSafeBtn = document.querySelector('.safeBtn');
    elSafeBtn.querySelector('span').innerText = gSafesCount;
    if (!gSafesCount) {
        elSafeBtn.classList.remove('active');
    }
    if (!safeCells.length) return;

    var idx = getRandomInt(0, safeCells.length);
    var cell = safeCells[idx];
    var elCell = document.querySelector(`.cell${cell.i}-${cell.j}`);
    elCell.innerHTML = SAFE;
    setTimeout(() => {
        if (elCell.innerHTML === SAFE) elCell.innerHTML = NOT_CLICKED;
    }, 3000, elCell);
}

function getSafeCells(board) {
    var safeCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board.length; j++) {
            //turn the board to an 1D array, excluding unsafe cells
            var currCell = board[i][j];
            if (currCell.isShown || currCell.isMarked || currCell.isMine) continue;
            safeCells.push({ i, j });
        }
    }
    return safeCells
}


function hideAllMines() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard.length; j++) {
            var currCell = gBoard[i][j];
            currCell.isShown = false;
        }
    }
}



function resetBtnAndStats() {
    //reset buttons ans stats
    document.querySelector('.timer span').innerText = 0;
    document.querySelector('.lives').innerText = 'Lives: 3';
    document.querySelector('.smiley').innerText = SMILEY;
    var elHintBtn = document.querySelector('.hintBtn');
    elHintBtn.classList.remove('active');
    elHintBtn.querySelector('span').innerText = gHintsCount;
    var elSafeBtn = document.querySelector('.safeBtn');
    elSafeBtn.classList.remove('active');
    elSafeBtn.querySelector('span').innerText = gSafesCount;
    document.querySelector('.manualMinesBtn').classList.add('active');
    document.querySelector('.svnBoomBtn').classList.add('active');
}