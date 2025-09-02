---
title: "home-managerでインストールしたSwayがなぜかデフォルトでワークスペース10を開く問題の解決方法"
date: 2025-09-02T23:57:03+0900
categories:
    - tech
tags:
    - Nix
    - Sway
---

Swayのインストールを`configuration.nix`からhome-managerに移行したのですが、
以前は問題なかったのに、起動時に何故かワークスペース10を開くようになってしまいました。
本来であれば、ワークスペース1を開くはずです。

## 前提
- home-managerでSwayをインストールしている

## 解決方法
Redditに解決方法が載っていました。 \\
<https://www.reddit.com/r/swaywm/comments/1e5fjx4/comment/leubg98/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button>

デフォルトでワークスペース1を開くようにするには
```nix
wayland.windowManager.sway.config.defaultWorkspace = "workspace number 1";
```
と設定すればいいです。

## 原因
この問題が発生してしまう理由は、home-managerの仕様が原因のようです。

home-managerは生成した設定値を辞書順にソートします。
本来であれば
```
bindsym --inhibited Mod4+1 workspace number 1
bindsym --inhibited Mod4+2 workspace number 2
bindsym --inhibited Mod4+3 workspace number 3
bindsym --inhibited Mod4+4 workspace number 4
bindsym --inhibited Mod4+5 workspace number 5
bindsym --inhibited Mod4+6 workspace number 6
bindsym --inhibited Mod4+7 workspace number 7
bindsym --inhibited Mod4+8 workspace number 8
bindsym --inhibited Mod4+9 workspace number 9
bindsym --inhibited Mod4+0 workspace number 10
```
のように`Mod4+1`から`Mod4+9`、最後に`Mod4+0`の順に割り当てられるはずが、
辞書順にソートされることで

```
bindsym --inhibited Mod4+0 workspace number 10
bindsym --inhibited Mod4+1 workspace number 1
bindsym --inhibited Mod4+2 workspace number 2
bindsym --inhibited Mod4+3 workspace number 3
bindsym --inhibited Mod4+4 workspace number 4
bindsym --inhibited Mod4+5 workspace number 5
bindsym --inhibited Mod4+6 workspace number 6
bindsym --inhibited Mod4+7 workspace number 7
bindsym --inhibited Mod4+8 workspace number 8
bindsym --inhibited Mod4+9 workspace number 9
```

のように`Mod4+0`が一番最初に来てしまいます。`Mode4+0`に割り当てられているのは
ワークスペース10なので、Swayが起動したときにこれが起動してしまうというわけです。

`configuration.nix`でインストールしたときに発生しなかったのはhome-managerが悪さしていたからなんですね。

## 最後に
`wayland.windowManager.sway.config.defaultWorkspace`というオプションがあることは
自分で突き止められたんですが、値に`workspace number 1`という風に設定しないといけないのはどこにも書いてなかったので時間がかかりました。
Redditに記載されていなかったら多分解決できていなかったと思います。