#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <post-title>"
  exit 1
fi

export TZ=Asia/Tokyo

cat <<EOF > "_posts/$(date +%Y-%m-%d)-$1.md"
---
title: "$1"
date: $(date +%Y-%m-%dT%H:%M:%S%z)
categories:
tags:
---

EOF

echo "New post created: _posts/$(date +%Y-%m-%d)-$1.md"
