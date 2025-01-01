'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  return (
   <div>
     <Chessboard />
   </div>
  );
}

const initialBoard = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const pieceToImage = {
  r: '/pieces/br.png',
  n: '/pieces/bn.png',
  b: '/pieces/bb.png',
  q: '/pieces/bq.png',
  k: '/pieces/bk.png',
  p: '/pieces/bp.png',
  R: '/pieces/wr.png',
  N: '/pieces/wn.png',
  B: '/pieces/wb.png',
  Q: '/pieces/wq.png',
  K: '/pieces/wk.png',
  P: '/pieces/wp.png'
}

function boardToFen(board): string {
  return board.map(row => {
    let empty = 0;
    return row.map(cell => {
      if (cell === '') {
        empty++;
        return '';
      } else {
        const result = empty ? empty + cell : cell;
        empty = 0;
        return result;
      }
    }).join('') + (empty ? empty : '');
  }).join('/');
}

function Chessboard() {
  const [board, setBoard] = useState(initialBoard);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [fen, setFen] = useState(boardToFen(initialBoard));
  const [moves, setMoves] = useState([]);
  const [activeColor, setActiveColor] = useState('w');
  const [bestmove, setBestmove] = useState('');

  const onDragStart = (piece, row, col) => {
    setDraggedPiece({ piece, row, col });
  };

  const onDrop = (row, col) => {
    if (!draggedPiece) return;

    if(draggedPiece.row === row && draggedPiece.col === col) {
      setDraggedPiece(null);
      return;
    }

    const newBoard = board.map((r, i) => r.map((c, j) => {
      if (i === draggedPiece.row && j === draggedPiece.col) return '';
      if (i === row && j === col) return draggedPiece.piece;
      return c;
    }));

    setActiveColor(activeColor === 'w' ? 'b' : 'w');
    const moveNotation = `${String.fromCharCode(97 + draggedPiece.col)}${8 - draggedPiece.row}${String.fromCharCode(97 + col)}${8 - row}`;
    setMoves([...moves, moveNotation]);
    setBoard(newBoard);
    setFen(boardToFen(newBoard));
    setDraggedPiece(null);
  };

  useEffect(() => {
    async function callApi() {
      console.log('analytics');
      console.log(fen);
      console.log(moves);

      await commandEngine();
      await getEval();
    }

    callApi();

  }, [fen]);

  // make a post call to localhost:3001/command with the FEN as the body
  async function commandEngine() {
    const fenToSend = fen == boardToFen(initialBoard) ? '' : fen;

    try {
      const cmdResponse = await fetch('http://localhost:3001/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fen: fenToSend, active: activeColor, moves: moves, depth: 3 })
      });

      const data = await cmdResponse.json();
      console.log(data);

      const lines = data.response.split('\n');
      setBestmove(lines[lines.length - 2]);
    }
    catch (error) {
      console.error(error);
    }
  }

  // get the eval of the current board
  async function getEval() {
    try {
      const evalResponse = await fetch('http://localhost:3001/api/eval', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // body: JSON.stringify({ fen: fen })
      });

      const data = await evalResponse.json();
      console.log(data);
    }
    catch (error) {
      console.error(error);
    }
  }

  function newGame() {
    setMoves([]);
    setBoard(initialBoard);
    setFen(boardToFen(initialBoard));

    fetch('http://localhost:3001/api/newgame', {})
  }

  return (
    <div>
      <div className="flex justify-end p-2">
        <button onClick={newGame} className="bg-gray-800 p-2 rounded text-sm">New Game</button>
      </div>

      <div className="p-8 flex flex-row gap-10">
        <div>
          <div className="grid grid-cols-8 border border-gray-700 w-[32rem]">
            {board.map((row, i) =>
              row.map((piece, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-16 h-16 flex items-center justify-center relative ${
                    (i + j) % 2 === 0 ? 'bg-gray-200' : 'bg-gray-700'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i, j)}
                >
                  {piece && (
                    <Image
                      src={pieceToImage[piece]}
                      alt="chess piece"
                      width={64}
                      height={64}
                      draggable
                      onDragStart={() => onDragStart(piece, i, j)}
                    />
                  )}
                  <span className="absolute top-0 left-0 text-xs text-blue-500">
                    {String.fromCharCode(97 + j)}{8 - i}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <Moves moves={moves} />
        <Commentary fen={fen} moves={moves} activeColor={activeColor} bestmove={bestmove} />
      </div>

    </div>
  );
}

function Commentary({fen, moves, activeColor, bestmove}) {
  const [commentary, setCommentary] = useState('');

  useEffect(() => {
    if(bestmove){
      getCommentary();
    }

  }, [bestmove]);

  async function getCommentary() {
    console.log("getCommentary");

    try {
      const commentaryResponse = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          {
            "model": "llama3.2",
            "stream": false,
            "messages": [
              {
                "role": "system",
                "content": `
                  You are a chess commentator.
                  You will be given a FEN for you to know the current board state, together with a list of moves that already happen.
                  Including the current move that was made.
                  You will be also given the best move to be made by the player.
                  There will also be a ponder move for the opponent.
                  You are to provide a very short commentary on current board state.
                  Provide any opening name if you can recognize it.
                  Then explain the best move.
                  Do not hallucinate. Stick to the board state.
                  `
              },
              {
                "role": "user",
                "content": `
                  FEN: ${fen},
                  MOVES: ${moves.join(' ')},
                  PLAYER TO MOVE: ${activeColor},

                  ${bestmove}
                `
              }
            ]
          }
        )
      });

      const data = await commentaryResponse.json();
      console.log(data);
      // console.log(data.message.content);
      setCommentary(data.message.content);
    }
    catch (error) {
      console.error(error);
    }
  }


  return (
    <div className='flex flex-col gap-5'>
      <div>
        <h1 className='text-2xl font-bold'>Engine</h1>
        <p className="mt-2">FEN: {fen}</p>
        <p className="mt-2">{bestmove}</p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Commentary</h1>
        <pre className="mt-4 text-xs whitespace-pre-line">{commentary}</pre>
      </div>
    </div>
  );
}

function Moves({moves}) {
  // moves is an array of strings
  // convert it to an array of pairs
  // and display each pair in a row
  // e.g. ['e4', 'e5', 'Nf3', 'Nc6'] => ['e4 e5', 'Nf3 Nc6']
  moves = moves.reduce((acc, move, i) => {
    if(i % 2 === 0) {
      acc.push(move);
    } else {
      acc[acc.length - 1] += ` ${move}`;
    }

    return acc;
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Moves</h1>
      <div className="mt-2">
        {moves.map((move, i) => (
          <div key={i} className="text-sm">{move}</div>
        ))}
      </div>
    </div>
  );
}

