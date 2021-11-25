'use strict'

//consts
const MINE = `<img src="img/bomb1.png">`;
const DISARMED = `<img src="img/disarmed.png">`;
const FLAG = '<img src="img/grassFlag.png">';
const NOT_CLICKED = '<img src="img/grass.png">';
const EMPTY = '<img src="img/empty.png">';
const SMILEY = '🙂';
const FEAR_SMILEY = '😮';
const WIN_SMILEY = '😎';
const LOSE_SMILEY = '😵';


//globals
var gBoard = [];
var gBoardSnapshots = [];
var gLevel = {
    SIZE: 4,
    MINES: 2
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
var gIsShowFear = false;
var gLives = 3;
var gSnapshotIdx = 0;



//initialize game and parameters
function initGame() {
    gBoard = buildBoard();
    resetGame();
    var elBestTime = document.querySelector('.bestTime');
    var currLvl = gLevel.SIZE;
    switch (currLvl) {
        case 4:
            elBestTime.innerText = localStorage.getItem('begginer');
            break;
        case 8:
            elBestTime.innerText = localStorage.getItem('medium');
            break;
        case 12:
            elBestTime.innerText = localStorage.getItem('expert');
            break;
    }
    // console.log(elBestTime.innerText);
    // document.getElementById("result").innerHTML = localStorage.getItem("lastname");
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
                //-1 not a mine, 0 not disarmed, 1 disarmed
                isDisarmed: -1,
                isMarked: false
            }
        }
    }
    return board;
}


function resetGame() {
    gGame.isOn = false;
    gGame.isLost = false;
    gGame.isfirstClick = true;
    gLives = 3;
    gGame.shownCount = 0;
    gGame.markedCount = 0;
    gGame.disarmedCount = 0;
    gIsShowFear = true;
    gBoardSnapshots = [];
    gSnapshotIdx = 0;
    clearInterval(gIntervalId);
    document.querySelector('.timer span').innerText = 0;
    document.querySelector('.lives').innerText = 'Lives: 3';
    document.querySelector('.smiley').innerText = SMILEY;
    renderBoard(gBoard);
    //disanimate undo button
    toggleUndoBtn(false);
}


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
            //handle shown cell
            else if (currCell.isShown) {
                if (currCell.minesAroundCount) cellContent = `<span class="negs">${currCell.minesAroundCount}</span> ${EMPTY}`;
                else cellContent = EMPTY;
                //handle not shown cell
            } else {
                if (currCell.isMarked) cellContent = FLAG;
                else if (gGame.isLost && currCell.isMine) cellContent = MINE;
                else cellContent = NOT_CLICKED;
            }
            var className = `cell cell${i}-${j}`;
            strHTML += `<td class="${className}" oncontextmenu="return false;" onmousedown="whichMouseBtn(this,${i},${j},event)">
            ${cellContent}
            </td>`;
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

    //animate smiley on every click
    if (gIsShowFear) showFearSmiley();
    //cell already shown
    var cell = gBoard[i][j];
    if (cell.isShown) return;
    if (cell.isDisarmed === 1) return;
    //handle first click
    if (gGame.isfirstClick) {
        gGame.isOn = true;
        gGame.isfirstClick = false;
        //Randomly place mines
        placeMinesRandomly(i, j);
        //update MOD
        setMinesNegsCount(gBoard);
        //start game time
        startTimeInterval();
    }
    //dont click if game is not on
    if (!gGame.isOn) return;

    //Mark/unmark if right button is clicked
    if (isRightBtn) {
        markCell(i, j);
        pushToUndoBoard(gBoard);
        renderBoard(gBoard);
        return;
    }
    //mine is clicked
    if (cell.isMine) {
        if (cell.isMarked) return;
        //check if decrease life or lose
        gGame.isLost = checkGameLost(cell);
        pushToUndoBoard(gBoard);
        renderBoard(gBoard);
        if (checkGameOver()) winGame();
        return;
    }
    //prevent clicking flag
    if (cell.isMarked) return;
    //single number situation
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


//Called on right click to mark a cell (suspected to be a mine). Search the web (and implement) how to hide the context menu on right click.
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





//When user clicks a cell with no mines around, we open not only that cell, but also its neighbors. 
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

//Game ends when all mines are marked, and all the other cells are shown.
function checkGameOver() {
    var shownPlusMarked = gGame.markedCount + gGame.shownCount;
    var disarmedPlusMarked = gGame.disarmedCount + gGame.markedCount;
    if (shownPlusMarked === gLevel.SIZE ** 2 && disarmedPlusMarked === gLevel.MINES) return true;
    return false;
}


function checkGameLost(cell) {

    if (!gLives) {
        //no lives left
        //stop clock
        clearInterval(gIntervalId);
        //makes sure all mines are shown in next render
        gGame.isLost = true;
        //prevent further clicks
        gGame.isOn = false;
        gIsShowFear = false;
        document.querySelector('.smiley').innerText = LOSE_SMILEY;
        //disanimate undo button
        toggleUndoBtn(false);
        return true;
    }
    //more lives left
    gLives--;
    document.querySelector('.lives').innerText = `Lives: ${gLives}`;
    cell.isDisarmed = 1;
    cell.isShown = true;
    gGame.shownCount++;
    gGame.disarmedCount++;
    return false;
}
function winGame() {
    clearInterval(gIntervalId);
    updateBestScore();
    gGame.isOn = false;
    gIsShowFear = false;
    document.querySelector('.smiley').innerText = WIN_SMILEY;
    //disanimate undo button
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
    setTimeout(function () {
        if (!gIsShowFear) return;
        elSmiley.innerText = SMILEY;
    }, 200, elSmiley);
}

function undoStep() {
    if (!gGame.isOn) return;
    if (gSnapshotIdx < 2) return;
    //disanimate undo button
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
    //animate undo button
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
            var bestTime = localStorage.getItem('begginer');
            var currTime = +document.querySelector('.currTime').innerText;
            console.log(currTime);
            console.log(bestTime);
            if (currTime < bestTime) localStorage.setItem("begginer", currTime);
            break;
        case 8:
            var bestTime = localStorage.getItem('medium');
            var elCurrTime = +document.querySelector('.currTime');
            if (currTime < bestTime) localStorage.setItem("medium", currTime);
            break;
        case 12:
            var bestTime = localStorage.getItem('expert');
            var elCurrTime = +document.querySelector('.currTime');
            if (currTime < bestTime) localStorage.setItem("expert", currTime);
            break;
    }
}

