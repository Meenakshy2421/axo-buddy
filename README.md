# 🩷 Axo Buddy

A blocky 3D Minecraft axolotl that lives on your desktop, keeps you company while you code, and helps with LeetCode.

Inspired by gnani.dev.

## Features
- Always-on-top, draggable 3D axolotl with pixel-art expressions
- Sees your screen and reacts in Minecraft-style chat boxes
- Gives hints (not full answers) and points out mistakes when you're coding
- Falls asleep after 3 minutes of inactivity
- Sits and watches with you when a video is playing
- Chats on its own with jokes and reminders

## Tech
Electron, Three.js, Electron desktopCapturer, Google Gemini API (free tier)

## Setup
1. `npm install`
2. Copy `config.example.json` to `config.json` and add a free Gemini key from https://aistudio.google.com
3. (Optional) add a Minecraft-style font at `assets/Minecraft.ttf`
4. `npm start`

## Controls
Drag to move · Click to poke · Double-click to chat · Right-click for pause/quit

## Privacy
Screenshots are sent to the Gemini API. Pause Axo when sensitive content is on screen.

Built with help from Claude.
