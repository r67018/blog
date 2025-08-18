---
title: "NixでVSCode起動時にkeyringを指定したい"
date: 2025-08-19T02:44:12+0900
categories:
    - tech
tags:
    - Nix
    - VSCode
---

## 前提条件
- NixでVSCodeをインストールしている
- home-managerを使用している

## 発生した問題
WMをGNOMEからSwayに切り替えた後、VSCodeを開くと

> An OS keyring couldn't be identified for storing the
> encryption related data in your current desktop
> environment.

というダイアログが出ました。
このエラーはVSCodeがkeyringを特定できないために発生するエラーです。
このエラー自体はVSCodeの[トラブルシューティング][1]に則って`~/.vscode/argv.json`に
`"password-store": "gnome-libsecret"`を追加すれば解決することができます。

しかし、せっかくパッケージや設定をNixで管理しているなら、この設定もNixで管理したいですよね。

最初はhome.nixに直接JSONを記述して、それを`~/.vscode/argv.json`にコピーしようと思っていました。
しかし、`argv.json`の中にはデフォルトで`crash-reporter-id`というプロパティがあり、
`crash-report-id`について以下のようにコメントしてあります。
```
// Unique id used for correlating crash reports sent from this instance.
// Do not edit this value.
"crash-reporter-id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
```

要約すると、このIDはインスタンスごとに異なるので編集しないでね、ということです。
そのため、既存の`argv.json`は残しつつ、そこに`password-store`の値を追加する必要がありました。

## Nixでargv.jsonに値を追加する
ということで、home-managerの設定ファイルでオプションを追加するようにしたいのですが、`vscode`パッケージはランタイム引数を渡すためのオプションを提供していないようです。
そのため、少し無理矢理ですがjqを使って既存の`argv.json`と追加のオプションをマージする方向性で実現しようと思います。

これが最終的な設定です。
```nix
{ config, lib, pkgs, ... }:
let
  vscodeArgvFile = "~/.vscode/argv.json";
in
{
  # 略

  programs.vscode.enable = true;
  # Use gnome-keyring in VSCode
  # ref: https://code.visualstudio.com/docs/configure/settings-sync#_recommended-configure-the-keyring-to-use-with-vs-code
  home.activation.vscodeArgs = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
    if [ -f ${vscodeArgvFile} ]; then
      # Remove comment in JSON and merge with extra options
      sed -e 's://.*$::' -e '/\/\*/,/\*\//d' ${vscodeArgvFile} | \
      ${pkgs.jq}/bin/jq '. + {"password-store": "gnome-libsecret"}' > ${vscodeArgvFile}.tmp
      mv ${vscodeArgvFile}.tmp ${vscodeArgvFile}
    else
      mkdir -p $(dirname ${vscodeArgvFile})
      echo '{"password-store": "gnome-libsecret"}' > ${vscodeArgvFile}
    fi
  '';

  # 略
}
```

重要な部分はこの部分です。
```sh
sed -e 's://.*$::' -e '/\/\*/,/\*\//d' ${vscodeArgvFile} | \
  ${pkgs.jq}/bin/jq '. + {"password-store": "gnome-libsecret"}' > ${vscodeArgvFile}.tmp
mv ${vscodeArgvFile}.tmp ${vscodeArgvFile}
```

1行目の`sed`ではJSON内のコメントを削除しています。
これは、`jq`がコメント付きのJSONに対応していないためです。
コメントを削除した後、`jq`に結果を渡し、追加のオプションとマージします。
最後に、これを`~/.vscode/argv.json`にコピーして完了です。

この処理は`~/.vscode/argv.json`が無かった場合にエラーになるので、もしファイルが存在しない場合はオプション記述したJSONを新規作成しています。

以上の設定を`home.nix`に記載した後、`home-manager switch`して設定を反映させましょう。
`~/.vscode/argv.json`を確認すると`password-store`の値が追加されたJSONファイルが出力されているはずです。

## 最後に
かなり無理矢理な気はしますが、目的は達成できたので良しとします。
もっといい方法があれば教えてください！

[1]: https://code.visualstudio.com/docs/configure/settings-sync#_recommended-configure-the-keyring-to-use-with-vs-code