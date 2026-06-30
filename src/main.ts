const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App element not found");
}

app.innerHTML = `
  <canvas id="game" width="800" height="500"></canvas>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Canvas element not found");
}

const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error("Canvas context not found");
}

const player = {
  x: 100,
  y: 100,
  size: 30,
  speed: 4,
};

const coin = {
  x: 300,
  y: 200,
  size: 20,
};

const snake = {
  segments: [
    { x: 650, y: 400 },
    { x: 680, y: 400 },
    { x: 710, y: 400 },
    { x: 740, y: 400 },
  ],
  size: 24,
  speed: 2,
};

let score = 0;

const keys = new Set<string>();

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function movePlayer() {
  if (keys.has("w") || keys.has("arrowup")) {
    player.y -= player.speed;
  }

  if (keys.has("s") || keys.has("arrowdown")) {
    player.y += player.speed;
  }

  if (keys.has("a") || keys.has("arrowleft")) {
    player.x -= player.speed;
  }

  if (keys.has("d") || keys.has("arrowright")) {
    player.x += player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}

function isColliding() {
  return (
    player.x < coin.x + coin.size &&
    player.x + player.size > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.size > coin.y
  );
}

function moveCoin() {
  coin.x = Math.random() * (canvas.width - coin.size);
  coin.y = Math.random() * (canvas.height - coin.size);
}

function moveSnake() {
  const head = snake.segments[0];

  const dx = player.x - head.x;
  const dy = player.y - head.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    head.x += (dx / distance) * snake.speed;
    head.y += (dy / distance) * snake.speed;
  }

  for (let i = 1; i < snake.segments.length; i++) {
    const previous = snake.segments[i - 1];
    const current = snake.segments[i];

    const followDx = previous.x - current.x;
    const followDy = previous.y - current.y;
    const followDistance = Math.sqrt(followDx * followDx + followDy * followDy);

    const spacing = snake.size + 4;

    if (followDistance > spacing) {
      current.x += (followDx / followDistance) * snake.speed;
      current.y += (followDy / followDistance) * snake.speed;
    }
  }
}

function update() {
  movePlayer();
  moveSnake();

  if (isColliding()) {
    score += 1;
    moveCoin();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText(`Score: ${score}`, 20, 35);

  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  ctx.fillStyle = "gold";
  ctx.fillRect(coin.x, coin.y, coin.size, coin.size);

  ctx.fillStyle = "lime";

  for (const segment of snake.segments) {
    ctx.fillRect(segment.x, segment.y, snake.size, snake.size);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();