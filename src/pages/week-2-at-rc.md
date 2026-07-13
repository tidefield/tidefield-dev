---
layout: ../layouts/PostLayout.astro
title: "Recurse Center, week 2"
date: "2026-07-13"
description: "Crafting Interpreters, learning BLE, and settling into exploration"
image: "/images/rc-week-2-running.png"
---

## Back home

It's been wonderful being back in Atlanta. It's been a year since I last had the delicious Vietnamese dishes cooked by my mom. Every day has felt festive.

Besides midday walks, I ran 4 times for a total distance of 28.59 km (17.77 miles).

![Running route and stats](/images/rc-week-2-running.png)

## Crafting Interpreters

I got bored wrapping up the last pieces of the tree-walk interpreter in [*Crafting Interpreters*](https://craftinginterpreters.com/contents.html), especially classes and inheritance, because they are mostly extensions of the previous chapters. My eyes were tired from reading a long book on the screen, but I still believe I need to go through this phase in order to achieve mastery. I'm glad that part is over now, and I'm on the "Bytecode Virtual Machine" part next.

Like running, I need to endure the soreness in my legs before I can see the results or reach longer distances.

A few things I'll do differently next week:

- Read the physical book instead of the website to reduce screen time. I'm grateful that my brother gifted me the book.
- Connect the new concepts I learn to broader ideas outside the book.

## Open source

I got two Biome PRs accepted and merged:

- [chore(markdown): update prettier and test fixtures for markdown](https://github.com/biomejs/biome/pull/10882)
- [fix(markdown): parse whitespace after list markers](https://github.com/biomejs/biome/pull/10869)

## Research paper

I've been conflicted about how much AI assistance to use when learning new things. Reading the paper ["Programming as Theory Building"](https://pages.cs.wisc.edu/~remzi/Naur.pdf) helped me zoom out and look at programming from a different perspective. I think I'm getting a better sense of when to "write code by hand to build understanding" versus when to "let AI help me move faster." I'll probably reread it a few more times.

## Bluetooth

For the pairing jam day, I ventured out and did something outside my comfort zone. I've been wanting to make my Garmin watch sync track logs to my MacBook and, ideally, into the daily journal in my Obsidian vault. I didn't have any background in Bluetooth and hardware in general. Luckily, a batchmate gave me an intro to BLE.

I used Codex to implement a script to scan BLE advertisements from nearby devices.

```shell
$ ./ble-scan
...
[-76dBm] (unknown) id=[redacted] seen=50x services=[] manufacturer=[870010A1]
...
```

This advertisement did not include the watch's name. However, the manufacturer data starts with `87 00`, which decodes to the Bluetooth company identifier `0x0087`: Garmin International, Inc. I reverse-engineered it with the [list of assigned IDs in the Bluetooth spec](https://bitbucket.org/bluetooth-SIG/public/src/f730a9f773ff002bd40d5283cab51e75608b660d/assigned_numbers/company_identifiers/company_identifiers.yaml#lines-11646:11647).

![Bluetooth company identifier lookup](/images/rc-week-2-bluetooth.png)

I time-boxed the adventure to one day. In the end, I was able to connect to it from my MacBook and live-stream my heart rate in the terminal. I have all kinds of wild ideas from here and will think about them more in the coming weeks.

## Misc

I also spent Friday afternoon setting up Neovim. I have never been a heavy Vim user and usually shy away from terminal-based editors. To my surprise, it was not as intimidating as I thought.

Getting ramped up on a new editor does not make much practical sense, so I usually do not spend much time tuning my own setup. One thing I love about being at RC is that it encourages me to break from that tendency. I have the space and time to explore the random things that have been sitting in the back of my mind.
