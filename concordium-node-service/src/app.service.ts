import { Injectable } from '@nestjs/common';
import {
  deserializeReceiveReturnValue,
  HttpProvider,
  JsonRpcClient,
  serializeUpdateContractParameters,
} from '@concordium/common-sdk';
import { Buffer } from 'buffer/';
import { RequestDto, TransactionDto } from './serialize-params.dto';
import {
  BRIDGE_CONTRACT_RAW_SCHEMA,
  TOKEN_CONTRACT_RAW_SCHEMA,
  CONTRACT_NAME_GBM_BRIDGE,
  CONTRACT_NAME_GBM_TOKEN,
  CONTRACT_ADDRESS_GBM_BRIDGE_INDEX,
  CONTRACT_ADDRESS_GBM_BRIDGE_SUBINDEX,
  CONTRACT_ADDRESS_GBM_TOKEN_INDEX,
  CONTRACT_ADDRESS_GBM_TOKEN_SUBINDEX,
} from './consts';
import {WebSocketSubject} from "rxjs/webSocket";

@Injectable()
export class AppService {
  async getWithdrawHash(request: RequestDto): Promise<string> {
    const param = serializeUpdateContractParameters(
      CONTRACT_NAME_GBM_BRIDGE,
      'withdraw_hash',
      request.parameters,
      Buffer.from(BRIDGE_CONTRACT_RAW_SCHEMA, 'base64') as any,
    );
    const gRPCProvider = new HttpProvider(
      'https://concordium-json-rpc.bridge.bankofmemories.org',
    );
    const rpcClient = new JsonRpcClient(gRPCProvider);
    const res = await rpcClient.invokeContract({
      method: `${CONTRACT_NAME_GBM_BRIDGE}.withdraw_hash`,
      contract: {
        index: CONTRACT_ADDRESS_GBM_BRIDGE_INDEX,
        subindex: CONTRACT_ADDRESS_GBM_BRIDGE_SUBINDEX,
      },
      parameter: param,
    });
    if (!res || res.tag === 'failure' || !res.returnValue) {
      throw new Error(
        `RPC call 'invokeContract' on method ${CONTRACT_NAME_GBM_BRIDGE}.withdraw_hash of contract ${CONTRACT_ADDRESS_GBM_BRIDGE_INDEX} failed - ${res}`,
      );
    }
    const returnValues = deserializeReceiveReturnValue(
      Buffer.from(res.returnValue, 'hex') as any,
      Buffer.from(BRIDGE_CONTRACT_RAW_SCHEMA, 'base64') as any,
      CONTRACT_NAME_GBM_BRIDGE,
      'withdraw_hash',
      0,
    );
    // eslint-disable-next-line no-console
    console.log(returnValues);

    return returnValues;
  }

  async withdraw(request: RequestDto): Promise<string> {
    const param = serializeUpdateContractParameters(
      CONTRACT_NAME_GBM_BRIDGE,
      'withdraw',
      request.parameters,
      Buffer.from(BRIDGE_CONTRACT_RAW_SCHEMA, 'base64') as any,
    );
    const gRPCProvider = new HttpProvider(
      'https://concordium-json-rpc.bridge.bankofmemories.org',
    );
    const rpcClient = new JsonRpcClient(gRPCProvider);
    console.log(param.toString());
    const res = await rpcClient.invokeContract({
      method: `${CONTRACT_NAME_GBM_BRIDGE}.withdraw`,
      contract: {
        index: CONTRACT_ADDRESS_GBM_BRIDGE_INDEX,
        subindex: CONTRACT_ADDRESS_GBM_BRIDGE_SUBINDEX,
      },
      parameter: param,
    });
    if (!res || res.tag === 'failure' || !res.returnValue) {
      throw new Error(
        `RPC call 'invokeContract' on method ${CONTRACT_NAME_GBM_BRIDGE}.withdraw of contract ${CONTRACT_ADDRESS_GBM_BRIDGE_INDEX} failed`,
      );
    }
    const returnValues = deserializeReceiveReturnValue(
      Buffer.from(res.returnValue, 'hex') as any,
      Buffer.from(BRIDGE_CONTRACT_RAW_SCHEMA, 'base64') as any,
      CONTRACT_NAME_GBM_BRIDGE,
      'withdraw',
      0,
    );
    // eslint-disable-next-line no-console
    console.log(returnValues);

    return returnValues;
  }

  async deposit(request: RequestDto): Promise<string> {
    const param = serializeUpdateContractParameters(
      CONTRACT_NAME_GBM_BRIDGE,
      'deposit',
      request.parameters,
      Buffer.from(BRIDGE_CONTRACT_RAW_SCHEMA, 'base64') as any,
    );
    const gRPCProvider = new HttpProvider(
      'https://concordium-json-rpc.bridge.bankofmemories.org',
    );
    const rpcClient = new JsonRpcClient(gRPCProvider);
    const res = await rpcClient.invokeContract({
      method: `${CONTRACT_NAME_GBM_BRIDGE}.deposit`,
      contract: {
        index: CONTRACT_ADDRESS_GBM_BRIDGE_INDEX,
        subindex: CONTRACT_ADDRESS_GBM_BRIDGE_SUBINDEX,
      },
      parameter: param,
    });
    if (!res || res.tag === 'failure' || !res.returnValue) {
      throw new Error(
        `RPC call 'invokeContract' on method ${CONTRACT_NAME_GBM_BRIDGE}.deposit of contract ${CONTRACT_ADDRESS_GBM_BRIDGE_INDEX} failed`,
      );
    }
    const returnValues = deserializeReceiveReturnValue(
      Buffer.from(res.returnValue, 'hex') as any,
      Buffer.from(BRIDGE_CONTRACT_RAW_SCHEMA, 'base64') as any,
      CONTRACT_NAME_GBM_BRIDGE,
      'deposit',
      0,
    );
    // eslint-disable-next-line no-console
    console.log(returnValues);

    return returnValues;
  }

  async getDepositParams(request: TransactionDto): Promise<object> {
    const gRPCProvider = new HttpProvider(
      'https://concordium-json-rpc.bridge.bankofmemories.org',
    );
    const rpcClient = new JsonRpcClient(gRPCProvider);
    async function getTransactionStatus() {
      return await new Promise(function (resolve) {
        setTimeout(
          () => resolve(rpcClient.getTransactionStatus(request.hash)),
          3000,
        );
      });
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    let res;
    let i = 0;
    let stopped = false;
    do {
      try {
        await getTransactionStatus().then((response: any) => {
          i = i + 1;
          if (response.status === 'finalized') {
            stopped = true;
            res = response;
          }
        });
      } catch (err) {
        console.log(err);
        i = i + 1;
      }
    } while (!stopped && i < 20);
    console.log('stopped - ', stopped);
    console.log('i - ', i);
    console.log('res - ', res);
    if (!stopped) {
      return {
        err: 'Try later',
      };
    }
    try {
      const blockHash = Object.keys(res.outcomes)[0];
      const event = res.outcomes[blockHash].result['events'].find(
        (result) =>
          result.receiveName === `${CONTRACT_NAME_GBM_BRIDGE}.deposit`,
      );
      const message = event.message;
      const from = event.instigator.address;
      const serializedTransaction = Buffer.from(message, 'hex');
      const serializedDestination = serializedTransaction.slice(200, 256);
      const serializedAmount = serializedTransaction.slice(
        256,
        serializedTransaction.length,
      );
      return {
        amount: serializedAmount.readBigUInt64LE(0).toString(),
        destination: Buffer.from(serializedDestination).toString(),
        blockHash,
        from,
      };
    } catch (e) {
      console.log(e);
      return {
        err: 'Try later',
      };
    }
  }

  async getBalanceOf(request: RequestDto): Promise<string> {
    console.log(request.parameters);
    console.log(JSON.stringify(request.parameters));
    const param = serializeUpdateContractParameters(
      CONTRACT_NAME_GBM_TOKEN,
      'balanceOf',
      request.parameters,
      Buffer.from(TOKEN_CONTRACT_RAW_SCHEMA, 'base64') as any,
    );
    const gRPCProvider = new HttpProvider(
      'https://concordium-json-rpc.bridge.bankofmemories.org',
    );
    const rpcClient = new JsonRpcClient(gRPCProvider);
    const res = await rpcClient.invokeContract({
      method: `${CONTRACT_NAME_GBM_TOKEN}.balanceOf`,
      contract: {
        index: CONTRACT_ADDRESS_GBM_TOKEN_INDEX,
        subindex: CONTRACT_ADDRESS_GBM_TOKEN_SUBINDEX,
      },
      parameter: param,
    });
    console.log(param);
    console.log(JSON.stringify(param));
    if (!res || res.tag === 'failure' || !res.returnValue) {
      if ('reason' in res) {
        console.log(JSON.stringify(res.reason));
      }
      throw new Error(
        `RPC call 'invokeContract' on method ${CONTRACT_NAME_GBM_TOKEN}.balanceOf of contract ${CONTRACT_ADDRESS_GBM_TOKEN_INDEX} failed`,
      );
    }
    const returnValues = deserializeReceiveReturnValue(
      Buffer.from(res.returnValue, 'hex') as any,
      Buffer.from(TOKEN_CONTRACT_RAW_SCHEMA, 'base64') as any,
      CONTRACT_NAME_GBM_TOKEN,
      'balanceOf',
      0,
    );
    // eslint-disable-next-line no-console
    console.log(returnValues);

    return returnValues;
  }
}
