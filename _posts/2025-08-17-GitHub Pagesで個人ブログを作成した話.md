---
title: "GitHub Pagesで個人ブログを作成した話"
date: 2025-08-17T13:05:05+0900
categories:
    - tech
tags:
    - GitHub
    - Jekyll
---

前から作りたかった個人ブログを今回GitHub Pagesを使って漸く構築できたので、その記録を残しておく。

## なぜ個人ブログを作成したのか
技術記事を書くだけならZennやQiitaを使えばいいけど、
- 技術記事以外も書いてみたい
- ポートフォリオも同時に公開したい

という理由からせっかくなら個人ブログを作成してみました。

今回採用した構成はGitHub Pages + Jekyllとなっています。
多分GitHub Pagesでブログを構築するなら一番メジャーな構成。
Jekyllのテーマはすごく悩んだが、GitHubのスター数が多くメンテナンスされており、カスタマイズ性が高そうな
[Minimal Mistakes][1]を選択しました。

## 見た目のこだわり
Minimal Mistakesには標準で
- air
- dark
- neon
- plum
- sunrise

といったカラースキーム(スキン)が用意されているので、それらを使えば簡単におしゃれなサイトを構築できます。
しかし、せっかく個人ブログを作成するなら見た目も自分好みのものにしようと思い、
Minimal Mistakesの[dark](https://mmistakes.github.io/minimal-mistakes/docs/configuration/#dark-skin-dark)
をベースに、NeovimやVSCodeでここ数年使い続けている[Iceberg][2]の色を参考に作成しました。
ちゃんとリスペクトを込めてフッターに表記してます。

また、フォントにも少しこだわっています。
本文のフォントは安定のNoto Sans JPですが、
コードブロックにはJetBrains Monoを使用しました。
Roboto Monoと悩みましたが、私が普段JetBrainsのIDEをよく使用していて馴染み深いフォントなのでJetBrains Monoにしました。
JetBrains Monoはこんな感じです。
```c
#include <stdio.h>

int main(void) {
    printf("Hello, world!");
    
    return 0;
}
```

とてもミニマルでかっこいいフォントだと思います。
ちなみに、シンタックスハイライトも標準だとIcebergはなかったため、
CSSを上書きして綺麗に表示されるように調整しました。

## 最後に
本当は自分でドメインを取ってセルフホスティングしたいところですが、
途中で挫折しそうなので一旦これで運用したいと思います。

まだカラースキームで微調整しないといけないところがあったりしますが、
結構かっこいいサイトができたのではないでしょうか。
自分好みに調整しようと思ったら手間はかかりますが、
ブログを作成したいだけならGitHub Pages + Jekyllで簡単にできたので、
まだ個人ブログを持っていない方は是非やってみてください。



[1]: https://github.com/mmistakes/minimal-mistakes
[2]: https://github.com/cocopon/iceberg.vim