---
title: "Nixvimでカラースキームをicebergに設定する"
date: 2025-09-02T00:08:04+0900
categories:
  - tech
tags:
  - Nixvim
---

Nixvimを導入したので、早速長年使っているカラースキームであるicebergを設定しようとしたら、
ちょっとだけ手間取ったので記事します。

## 設定方法
まず、Nixvimに組み込まれているカラームキームであれば、以下のように記述するだけで簡単にカラースキームを設定できます。
```nix
programs.nixvim = {
  colorschemes.gruvbox.enable = true;
};
```

しかし、icebergは`colorschemes`の中に含まれてません。
そのため、手動で設定する必要があります。
icebergを手動で設定するには以下のようにします。


```nix
programs.nixvim = {
  colorscheme = "iceberg";
  extraPlugins = with pkgs; [
    vimPlugins.iceberg-vim
  ];
};
```

簡単ですね。
幸運なことに、icebergは`nixpkgs.vimPlugins`で既にモジュール化されているため、これを用いて有効化できました。
icebergだけなく、nixpkgsに追加されているvimプラグインもこの方法で有効化できるみたいです。

まだNixvim何も分からんなので色々使ってみようと思います。

## 参考
<https://github.com/nix-community/nixvim?tab=readme-ov-file#colorschemes>