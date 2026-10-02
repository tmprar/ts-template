import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '#app/platform/config/env.schema.js'

@Injectable()
export class AppConfigService extends ConfigService<Env, true> {}
