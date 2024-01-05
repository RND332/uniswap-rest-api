import express from 'express';
import 'dotenv/config';
import { exec } from 'child_process';

const router = express.Router();

const workDir = process.env.WORK_DIR;

function createCall(tokenIn: string | undefined, tokenOut: string | undefined, amount: string | undefined, recipient: string | undefined) {
  if (!tokenIn || !tokenOut || !amount) {
    return 'Invalid params';
  }
  if (!recipient) {
    return `cd ${workDir} && ./bin/cli quote --tokenIn ${tokenIn} --tokenOut ${tokenOut} --amount ${amount} --exactIn --chainId 42161 --protocols v2,v3`;
  }
  return `cd ${workDir} && ./bin/cli quote --tokenIn ${tokenIn} --tokenOut ${tokenOut} --amount ${amount} --exactIn --chainId 42161 --recipient ${recipient} --protocols v2,v3`;
}

function extractBytes(input: string): string[] {
  const hexRegex = /0x[0-9a-fA-F]+/g;
  const matches = input.match(hexRegex);

  if (!matches) {
    throw new Error('No hexadecimal data found in the input');
  }

  return [
    ...matches
  ];
}

router.get('/', (req, res) => {
  const rawRequest = req.url.replace('/?', '');
  const request = rawRequest.split('&');

  const tokenIn = request[0].split('=')[1];
  const tokenOut = request[1].split('=')[1];
  const amount = request[2].split('=')[1];

  if (!tokenIn || !tokenOut || !amount) {
    res.send('Invalid params');
    return;
  }

  let recipient;
  if (request[3]) {
    recipient = request[3].split('=')[1];
  }

  exec(`${createCall(tokenIn, tokenOut, amount, recipient)}`, (err, stdout, stderr) => {
    const rawDatas = stdout.split('\n');
    
    const pools = extractBytes(rawDatas[1]);
    const estimateOut = parseFloat(rawDatas[3].replace('\x1B[32m\t\t', '').replace('\x1B[39m', ''));
    const callData = extractBytes(rawDatas[9]);
    const value = extractBytes(rawDatas[10]);
    
    res.send({
      "pools": pools,
      "estimateOut": estimateOut,
      "callData": callData[0],
      "value": value[0]
    });
  });
});

export default router;
