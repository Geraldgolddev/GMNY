import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CircleWebhookService,
  type CircleWebhookPayload,
} from './circle-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/circle')
export class CircleWebhookController {
  constructor(private readonly webhooks: CircleWebhookService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Circle transfer status webhook (sandbox-compatible)',
  })
  handle(
    @Body() body: CircleWebhookPayload,
    @Headers('x-circle-signature') signature?: string,
    @Headers('x-raw-body') rawBody?: string,
  ) {
    // Prefer reconstructed JSON for HMAC when raw middleware is not mounted.
    const payload = rawBody ?? JSON.stringify(body);
    return this.webhooks.handle(body, signature, payload);
  }
}
