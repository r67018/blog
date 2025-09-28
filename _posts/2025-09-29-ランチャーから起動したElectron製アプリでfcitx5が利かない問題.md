---
title: "ランチャーから起動したElectron製アプリでFcitxが利かない問題"
date: 2025-09-29T06:01:37+0900
published: false
categories:
    - tech
tags:
    - Electron
    - Fcitx
---

アプリケーションランチャー(wofi, fuzzelなど)からDiscordやObsidianなどのElectron製アプリを開いた際にFcitx5がうまく動作しない問題に直面しました。

# 問題
Electron製のアプリを起動したときにFcitxが利かない。

## 問題が発生する条件
- Swayのショートカット(Mod+d)経由でランチャーを呼び出し、そこからアプリを起動する。
- ターミナルからランチャーを実行したり、アプリを直接実行すると問題は発生しない。

## 環境
- NixOS 25.11
- sway 1.11

# 解決方法
environment.d経由で環境変数を設定します。
`~/.config/environment.d/fcitx.conf`に以下の内容を書きこんでください。
```
Enable fcitx on electron apps that launched from app lancher(like fuzzel) via sway
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
INPUT_METHOD=fcitx
SDL_IM_MODULE=fcitx
```
自分はhome-managerを使用しているため、home.nixに以下のように記述しました。
```
home.file.".config/environment.d/fcitx.conf" = {
    text = ''
      GTK_IM_MODULE=fcitx
      QT_IM_MODULE=fcitx
      XMODIFIERS=@im=fcitx
      INPUT_METHOD=fcitx
      SDL_IM_MODULE=fcitx
    '';
};
```
