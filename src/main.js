const MAX_WIDTH = 400;
const PIXEL_RATIO = window.devicePixelRatio || 1;
const BACKGROUND_COLOR = "rgb(62, 171, 93)";
const TEXT_COLOR = "white";
const INPUT_TEXT_COLOR = "rgb(142, 251, 173)";

let finished = false;

let currentWord = "";
let inputWords = [];

function resetInput() {
    currentWord = "";
    inputWords = [];
}

function deleteLetter() {
    if (currentWord.length > 0)
    {
        // drop last letter in current word
        currentWord = currentWord.slice(0, -1);
    }

    if (inputWords.length > 0 && currentWord.length == 0)
    {
        // replace current word with last word
        currentWord = inputWords[inputWords.length - 1];
        inputWords = inputWords.slice(0, inputWords.length - 1);
    }
}

function enterWord() {
    if (!checkWord(currentWord))
    {
        return;
    }

    inputWords.push(currentWord);
    currentWord = currentWord.slice(-1);

    // see if the game is finished
    const input = getInputString();
    for (let i = 0; i < letterButtons.length; i++)
    {
        let l = letterButtons[i].l;
        if (!input.includes(l))
        {
            return;
        }
    }

    currentWord = "";
    finished = true;
}

// Load compressed word list from server.
async function getWords() {
    const ds = new DecompressionStream("gzip");
    const words = await fetch("words.txt.gz")
        .then(response => response.blob())
        .then(blob => blob.stream())
        .then(stream => stream.pipeThrough(ds))
        .then(stream => new Response(stream).text())
        .then(text => text)
        .catch(error => console.log(error));

    return words.trim().split(" ");
}
const wordsPromise = getWords();
const words = await wordsPromise;

// Load letters from server
async function getLetters() {
    const letters = await fetch("today")
        .then(response => response.blob())
        .then(blob => blob.stream())
        .then(stream => new Response(stream).text())
        .then(text => text)
        .catch(error => console.log(error));

    return letters.trim();
}
const lettersPromise = getLetters();
const letters = await lettersPromise;

function checkWord(word) {
    return words.includes(word);
}

function getInputString() {
    if (inputWords.length == 0)
    {
        return currentWord;
    }

    let input = inputWords[0];
    for (let i = 1; i < inputWords.length; i++)
    {
        input += inputWords[i].slice(1);
    }
    input += currentWord.slice(1);;

    return input;
}

function checkLetter(letter) {
    const input = getInputString();
    for (let i = 0; i < input.length; i++)
    {
        if (input.includes(letter))
        {
            return true;
        }
    }
    return false;
}

function getSizes() {
    const width = Math.min(window.innerWidth, MAX_WIDTH);
    const height = 1.25 * width;

    const scale = width / MAX_WIDTH;

    const lineWidth = 3 * scale;
    const nodeSize = 12 * scale;
    const letterSize = 32 * scale;

    const boxSize = width - 5 * letterSize;
    const boxOffs = (width - boxSize) / 2;
    const boxYOffs = letterSize;
    const buttonSize = 1.0 * letterSize;

    return {
        width,
        height,
        lineWidth,
        nodeSize,
        letterSize,
        boxSize,
        boxOffs,
        boxYOffs,
        buttonSize,
    };
}

let {
    width,
    height,
    lineWidth,
    nodeSize,
    letterSize,
    boxSize,
    boxOffs,
    boxYOffs,
    buttonSize,
} = getSizes();

function getButtons() {
    let letterButtons = [];

    for (let i = 0; i < 3; i++)
    {
        const stride = boxSize / 3;
        const offs0 = boxOffs + stride * (i + 0.5);
        const offs1 = boxOffs;
        const offs2 = boxOffs + boxSize;

        // top
        letterButtons.push({
            l: letters[i + 0],
            lx: 0,
            ly: -letterSize,
            nx: offs0,
            ny: offs1 + boxYOffs,
        });

        // bottom
        letterButtons.push({
            l: letters[i + 3],
            lx: 0,
            ly: letterSize,
            nx: offs0,
            ny: offs2 + boxYOffs,
        });

        // left
        letterButtons.push({
            l: letters[i + 6],
            lx: -letterSize,
            ly: 0,
            nx: offs1,
            ny: offs0 + boxYOffs,
        });

        // right
        letterButtons.push({
            l: letters[i + 9],
            lx: letterSize,
            ly: 0,
            nx: offs2,
            ny: offs0 + boxYOffs,
        });
    }

    return letterButtons;
}
const letterButtons = getButtons();

function setCanvasSize(canvas) {
    canvas.style.width = width;
    canvas.style.height = height;
    canvas.style.margin = `0px ${(window.innerWidth - width) / 2}px`;
    canvas.width = width * PIXEL_RATIO;
    canvas.height = height * PIXEL_RATIO;
}

function prepare() {
    const canvas = document.createElement('canvas');
    canvas.style.background = BACKGROUND_COLOR;

    setCanvasSize(canvas);

    window.onresize = function(event) {
        canvas.style.margin = `0px ${(window.innerWidth - width) / 2}px`;
        draw();
    }

    const ctx = canvas.getContext("2d");
    ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

    document.getElementById("gameContainer").appendChild(canvas);
    return { canvas, ctx };
}

const { canvas, ctx } = prepare();

function createButton(x, y, text, callback) {
    ctx.font = `${0.75 * letterSize}px Arial`;
    const width = ctx.measureText(text).width;
    const height = letterSize;

    return {
        x: x,
        y: y,
        x0: x - 0.5 * width,
        y0: y - 1.75 * height, // add some vertical padding to make touch easier
        x1: x + 0.5 * width,
        y1: y + 1.75 * height,
        text: text,
        callback: callback,
    };
}

const inputButtonY = 1.25 * width - letterSize;
const resetButton =
    createButton(0.5 * width / 3, inputButtonY, "RESET", resetInput);
const deleteButton =
    createButton(1.5 * width / 3, inputButtonY, "DELETE", deleteLetter);
const enterButton =
    createButton(2.5 * width / 3, inputButtonY, "ENTER", enterWord);
const inputButtons = [resetButton, deleteButton, enterButton];

function drawInput() {
    const x = width / 2;
    const y = boxYOffs;

    ctx.font = `bold ${letterSize}px Arial`;

    let text = inputWords.join(" ‒ ");
    if (!finished)
    {
        if (inputWords.length > 0)
        {
            text += " ‒ ";
        }
    }
    const width0 = ctx.measureText(text).width;
    const width1 = width0 + ctx.measureText(currentWord).width;

    const max_width = 0.9 * width
    const textScale = max_width / Math.max(width1, max_width);

    ctx.font = `bold ${textScale * letterSize}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(text, x + textScale * (-width1 / 2), y);
    ctx.fillStyle = INPUT_TEXT_COLOR;
    ctx.fillText(currentWord, x + textScale * (-width1 / 2 + width0), y);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw input
    drawInput();

    // fill main rect
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(boxOffs, boxOffs + boxYOffs, boxSize, boxSize, nodeSize);
    ctx.fill();

    // lines
    ctx.lineWidth = 0.5 * nodeSize;
    ctx.strokeStyle = BACKGROUND_COLOR;
    ctx.beginPath();
    const input = getInputString();
    for (let i = 0; i < input.length; i++)
    {
        for (let j = 0; j < letterButtons.length; j++)
        {
            const button = letterButtons[j];
            if (input[i] === button.l)
            {
                if (i > 0)
                {
                    ctx.lineTo(button.nx, button.ny);
                }

                ctx.moveTo(button.nx, button.ny);
                break;
            }
        }
    }
    ctx.stroke();

    // stroke main rect
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.roundRect(boxOffs, boxOffs + boxYOffs, boxSize, boxSize, nodeSize);
    ctx.stroke();

    // nodes
    ctx.font = `${letterSize}px Arial`;
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    for (let i = 0; i < letterButtons.length; i++)
    {
        const button = letterButtons[i];
        ctx.fillStyle = checkLetter(button.l) ? BACKGROUND_COLOR : "white";
        ctx.beginPath();
        ctx.rect(
            button.nx - nodeSize / 2,
            button.ny - nodeSize / 2,
            nodeSize,
            nodeSize,
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(button.l, button.nx + button.lx, button.ny + button.ly);
    }

    // draw input buttons
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    if (!finished)
    {
        ctx.font = `${0.75 * letterSize}px Arial`
        for (let i = 0; i < inputButtons.length; i++)
        {
            let button = inputButtons[i];
            ctx.fillText(button.text, button.x, button.y);
        }
    } else {
        ctx.font = `${letterSize}px Arial`
        ctx.fillText("Nice Job!", width / 2, inputButtonY);
    }
}

canvas.addEventListener("mousedown", (e) => {
    const x = e.offsetX;
    const y = e.offsetY;
    const input = getInputString();

    if (finished)
    {
        return;
    }

    for (let i = 0; i < letterButtons.length; i++)
    {
        const button = letterButtons[i];
        if (!(input.length > 0 &&
            Math.floor(letters.indexOf(button.l) / 3) ==
            Math.floor(letters.indexOf(input.at(-1)) / 3)))
        {
            const bx = button.nx + button.lx;
            const by = button.ny + button.ly;
            const dist = Math.sqrt(
                Math.pow(x - bx, 2) + Math.pow(y - by, 2)
            );
            if (dist <= buttonSize)
            {
                currentWord += button.l;
                draw();
                return;
            }
        }
    }

    for (let i = 0; i < inputButtons.length; i++)
    {
        const button = inputButtons[i];

        if (button.x0 <= x && x < button.x1 && button.y0 <= y && y < button.y1)
        {
            button.callback();
            draw();
            return;
        }
    }
})

draw();
