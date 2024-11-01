import React, { useState, useEffect, useCallback } from 'react';
import { useInterval } from '../hooks/useInterval';
import { Trophy, Play, Pause, RotateCcw } from 'lucide-react';

type TetrominoType = readonly (readonly number[])[];
type Position = { x: number; y: number };

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_SPEED = 800;

const TETROMINOES: { [key: string]: TetrominoType } = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  L: [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const COLORS = {
  I: 'bg-cyan-500',
  O: 'bg-yellow-500',
  T: 'bg-purple-500',
  L: 'bg-orange-500',
  J: 'bg-blue-500',
  S: 'bg-green-500',
  Z: 'bg-red-500',
};

const createEmptyBoard = () =>
  Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill(0));

const Tetris: React.FC = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [position, setPosition] = useState<Position>({ x: 4, y: 0 });
  const [tetromino, setTetromino] = useState<TetrominoType>(TETROMINOES.I);
  const [tetrominoType, setTetrominoType] = useState<string>('I');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const getRandomTetromino = useCallback(() => {
    const types = Object.keys(TETROMINOES);
    const type = types[Math.floor(Math.random() * types.length)];
    return { type, shape: TETROMINOES[type] };
  }, []);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setPosition({ x: 4, y: 0 });
    const { type, shape } = getRandomTetromino();
    setTetromino(shape);
    setTetrominoType(type);
    setScore(0);
    setGameOver(false);
    setSpeed(INITIAL_SPEED);
  }, [getRandomTetromino]);

  const isColliding = useCallback(
    (pos: Position, shape: TetrominoType = tetromino) => {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const newX = pos.x + x;
            const newY = pos.y + y;
            if (
              newX < 0 ||
              newX >= BOARD_WIDTH ||
              newY >= BOARD_HEIGHT ||
              (newY >= 0 && board[newY][newX])
            ) {
              return true;
            }
          }
        }
      }
      return false;
    },
    [board, tetromino]
  );

  const rotate = useCallback(() => {
    const rotated = tetromino[0].map((_, i) =>
      tetromino.map((row) => row[i]).reverse()
    );
    if (!isColliding(position, rotated)) {
      setTetromino(rotated);
    }
  }, [tetromino, position, isColliding]);

  const moveHorizontal = useCallback(
    (delta: number) => {
      const newPos = { ...position, x: position.x + delta };
      if (!isColliding(newPos)) {
        setPosition(newPos);
      }
    },
    [position, isColliding]
  );

  const moveDown = useCallback(() => {
    const newPos = { ...position, y: position.y + 1 };
    if (!isColliding(newPos)) {
      setPosition(newPos);
      return true;
    }
    return false;
  }, [position, isColliding]);

  const mergeTetromino = useCallback(() => {
    const newBoard = board.map((row) => [...row]);
    for (let y = 0; y < tetromino.length; y++) {
      for (let x = 0; x < tetromino[y].length; x++) {
        if (tetromino[y][x]) {
          const boardY = position.y + y;
          if (boardY < 0) {
            setGameOver(true);
            return;
          }
          newBoard[boardY][position.x + x] = 1;
        }
      }
    }
    setBoard(newBoard);

    // Check for completed lines
    let completedLines = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every((cell) => cell)) {
        completedLines++;
        newBoard.splice(y, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(0));
      }
    }

    if (completedLines > 0) {
      const points = [0, 100, 300, 500, 800][completedLines];
      setScore((prev) => prev + points);
      setSpeed((prev) => Math.max(100, prev - 10));
    }

    // Spawn new tetromino
    const { type, shape } = getRandomTetromino();
    setTetromino(shape);
    setTetrominoType(type);
    setPosition({ x: 4, y: 0 });
  }, [board, position, tetromino, getRandomTetromino]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver || isPaused) return;

      switch (e.key) {
        case 'ArrowLeft':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          moveDown();
          break;
        case 'ArrowUp':
          rotate();
          break;
        case ' ':
          while (moveDown()) {}
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver, isPaused, moveHorizontal, moveDown, rotate]);

  useInterval(
    () => {
      if (!moveDown()) {
        mergeTetromino();
      }
    },
    !gameOver && !isPaused ? speed : null
  );

  const renderCell = (cell: number, x: number, y: number) => {
    let isCurrent = false;
    let currentType = '';

    if (!cell) {
      for (let tY = 0; tY < tetromino.length; tY++) {
        for (let tX = 0; tX < tetromino[tY].length; tX++) {
          if (
            tetromino[tY][tX] &&
            position.x + tX === x &&
            position.y + tY === y
          ) {
            isCurrent = true;
            currentType = tetrominoType;
            break;
          }
        }
      }
    }

    return (
      <div
        key={`${x}-${y}`}
        className={`w-6 h-6 border border-gray-700 ${
          cell
            ? 'bg-gray-600'
            : isCurrent
            ? COLORS[currentType]
            : 'bg-gray-900'
        }`}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="p-8 bg-gray-800 rounded-xl shadow-2xl">
        <div className="flex gap-8">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex items-center gap-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span className="text-2xl font-bold">{score}</span>
            </div>
            <div className="grid grid-cols-10 gap-px bg-gray-700 p-px">
              {board.map((row, y) =>
                row.map((cell, x) => renderCell(cell, x, y))
              )}
            </div>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" /> Pause
                  </>
                )}
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Controls</h2>
              <ul className="space-y-2">
                <li>← → : Move</li>
                <li>↑ : Rotate</li>
                <li>↓ : Soft Drop</li>
                <li>Space : Hard Drop</li>
              </ul>
            </div>
            {gameOver && (
              <div className="mt-4 text-center bg-red-600 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Game Over!</h2>
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-white text-red-600 rounded hover:bg-gray-100"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tetris;