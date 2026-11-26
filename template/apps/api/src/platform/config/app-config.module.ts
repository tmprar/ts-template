import {
  Global,
  Module,
} from '@nestjs/common'
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config'

import { AppConfigService } from '#app/platform/config/app-config.service.js'
import { envSchema as environmentSchema } from '#app/platform/config/env.schema.js'

@Global()
@Module({
  exports: [AppConfigService],
  imports: [
    ConfigModule.forRoot({
      /*
        process.env を読み直す既定の動作のままにしない。既定では、検証後の値が undefined のとき
        ConfigService#get が process.env を読み直すため、スキーマで未設定(undefined)に
        変えた空欄(`KEY=`)が空文字として返り、未設定かどうかの判定で未設定と判定されない
      */
      skipProcessEnv: true,
      validationSchema: environmentSchema,
    }),
  ],
  providers: [{
    provide: AppConfigService,
    useExisting: ConfigService,
  }],
})
export class AppConfigModule {}
