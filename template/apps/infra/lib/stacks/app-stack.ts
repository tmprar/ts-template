import type { Construct } from 'constructs'

import * as cdk from 'aws-cdk-lib'

/**
 * デプロイの本体。テンプレートの時点では空で、デプロイ先はプロジェクトごとに決めてここへ足す。
 * まとまりが大きくなったら `lib/constructs/` にコンストラクトとして切り出す
 */
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // プロジェクト名のタグ。費用の内訳をプロジェクト単位で見られるようにする
    cdk.Tags.of(this).add('Project', 'myapp')
  }
}
