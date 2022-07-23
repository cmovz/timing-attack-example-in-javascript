const crypto = require('crypto');

// Below is the secret password to be found
const secret = Buffer.alloc(8);
crypto.randomFillSync(secret);

/*
  Perform a timing safe equality comparison between 2 buffers.
  It might not work if one of the buffers is larger than 4GiB.
*/
function timingSafeEqual(a, b) {
  const len = a.length;
  let diff = a.length ^ b.length;
  
  for (let i = 0; i < len; i++) {
    diff |= a[i] ^ b[i];
  }
  
  return diff === 0;
}

/*
  Perform a naive equality comparison.
*/
function naiveEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/*
  Example login code
*/
function login(password) {
  // if naiveEqual() is replaced by timingSafeEqual(), then it's not possible to
  // find the password using brute-force
  if (naiveEqual(password, secret)) {
    console.log(secret);
    console.log('Found password');
    process.exit(0);
  }
}

function findPasswordLength(maxLength = 64) {
  const times = [];

  for (let i = 0; i <= maxLength; i++) {
    const guess = Buffer.alloc(i);
    const t0 = process.hrtime.bigint();
    for (let k = 0; k < 200_001; k++) {
      login(guess);
    }
    const t1 = process.hrtime.bigint();
    times.push(t1 - t0);
  }

  let bestTime = 0;
  let bestIdx = 0;
  times.forEach((time, i) => {
    if (time > bestTime) {
      bestTime = time;
      bestIdx = i;
    }
  });

  return bestIdx;
}

function findPassword() {
  const bufLen = findPasswordLength();
  const guesses = [];
  for (let i = 0; i < 16; i++) {
    guesses.push({time: -1n, buf: Buffer.alloc(bufLen)});
  }

  for (let i = 0; i < bufLen; i++) {
    console.log('position: ' + i);

    guesses.forEach((guess) => {
      const times = [];

      for (let j = 0; j < 256; j++) {
        guess.buf[i] = j;
        const t0 = process.hrtime.bigint();
        for (let k = 0; k < 20_001; k++) {
          login(guess.buf);
        }
        const t1 = process.hrtime.bigint();
        times.push(t1 - t0);
      }
      
      let bestTime = -1n; 
      let bestIdx = -1;
      times.forEach((time, k) => {
        if (time > bestTime) {
          bestTime = time;
          bestIdx = k;
        }
      });

      guess.time = bestTime;
      guess.buf[i] = bestIdx;
    });

    const bytes = {};
    guesses.forEach(guess => {
      const b = guess.buf[i];
      const obj = bytes[b] || {count: 0};
      obj.count += 1;
      bytes[b] = obj;
    });

    const arr = Object.keys(bytes).map(key => {
      return {key, count: bytes[key].count};
    });
    arr.sort((a, b) => a.count - b.count);
    const chosenByte = arr[arr.length - 1].key;
    guesses.forEach(guess => {
      guess.buf[i] = chosenByte;
    });

    console.log(guesses);
  }
}

while (true) {
  findPassword();
}