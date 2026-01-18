import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertJson(value: any): any {
  if (typeof value === 'bigint') return value.toString();

  // Convert Date objects to ISO strings
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(convertJson);

  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = convertJson(v);
    return out;
  }

  return value;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertJson(data)));
  }
}

