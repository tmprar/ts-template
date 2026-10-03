// CDK アプリのエントリ。環境ごとにスタックを並べる。
// 配備先に固有で秘密でない値(ドメイン名など)はここに直接書き、秘密の値はコードに置かない
import * as cdk from 'aws-cdk-lib'

import { AppStack } from '../lib/stacks/app-stack.ts'

const app = new cdk.App()

// 本番。スタックの id はプロジェクト名 + 環境名にして、同じアカウントの他プロジェクトと見分ける。
// アカウントとリージョンを固定するときは env を渡す(fromLookup を使うなら必須)
new AppStack(app, 'MyAppProd')
