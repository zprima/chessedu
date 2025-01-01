const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const { spawn } = require('child_process');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());


let stockfish;

// Start Stockfish on server startup
function startStockfish() {
    stockfish = spawn('../stockfish/stockfish-macos-m1-apple-silicon');  // Adjust path if needed

    stockfish.stderr.on('data', (data) => {
        console.error(`Stockfish Error: ${data}`);
    });

    stockfish.on('close', (code) => {
        console.log(`Stockfish exited with code ${code}`);
    });

    console.log('Stockfish engine started');
}

// Function to send commands to Stockfish
function sendCommand(command) {
    return new Promise((resolve) => {
        let output = '';

        const handler = (data) => {
            const text = data.toString();
            output += text;
            console.log(text);  // Log response in real-time
        };

        stockfish.stdout.on('data', handler);

        stockfish.stdin.write(`${command}\n`);
        console.log(`> ${command}`);

        setTimeout(() => {
            stockfish.stdout.off('data', handler);
            resolve(output);
        }, 1000);  // 1-second timeout for response
    });
}

app.get('/api/newgame', async (req, res) => {
    try {
        await sendCommand('ucinewgame');
        const response = await sendCommand('isready');
        res.send({response: response});
    } catch (err) {
        res.status(500).send('Error sending command to Stockfish');
    }
});

app.get('/api/eval', async (req, res) => {
    try {
        const response = await sendCommand('eval');
        const lines = response.split('\n');

        res.send({response: lines[lines.length - 3]});
    } catch (err) {
        res.status(500).send('Error sending command to Stockfish');
    }
});

// API to send commands to Stockfish
app.post('/api/command', async (req, res) => {
    console.log(req.body);

    try {
        const fenBoard = req.body.fen && req.body.fen.length > 0 ? `fen ${req.body.fen}` : 'startpos';
        const fenActiveColor = req.body.active;
        const fenMoves = (req.body.moves && req.body.moves.length > 1) ? `moves ${req.body.moves.join(' ')}` : '';
        const positionCommand = `position ${fenBoard} ${fenActiveColor} ${fenMoves}`;
        await sendCommand(positionCommand);

        const depth = req.body.depth ? `depth ${req.body.depth}` : 'depth 1';
        const response = await sendCommand(`go ${depth}`);
        // console.log(response);

        res.send({response: response});
    } catch (err) {
        res.status(500).send('Error sending command to Stockfish');
    }
});

// API to check if Stockfish is running
app.get('/health', (req, res) => {
    if (stockfish && !stockfish.killed) {
        res.send('Stockfish is running');
    } else {
        res.status(500).send('Stockfish is not running');
    }
});

// Start Express server and Stockfish
app.listen(port, () => {
    startStockfish();
    console.log(`Express server running on http://localhost:${port}`);
});
