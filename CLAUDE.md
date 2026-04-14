# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML portfolio site for delorenzi.me, hosted on GitHub Pages. No build system, no package manager, no dependencies — files are served as-is.

## Architecture

- 6 HTML pages: index, about, projects, blog, press, contacts
- Single stylesheet: `styles.css`
- Single script: `script.js` (responsive menu toggle + Medium RSS fetch)
- Custom domain configured via `CNAME` file

## Critical: Keep Pages in Sync

Navigation, ASCII art header, and footer are duplicated across all 6 HTML files. When modifying any shared element (nav links, header, footer), apply the same change to every page.

## Design Constraints

- Dark theme: black background, white text, monospace font (`"Courier New"`)
- Responsive breakpoint at 600px (hamburger menu on mobile)
- Fixed navbar and footer positioning

## External Dependencies

- `blog.html` fetches Medium RSS feed via `api.rss2json.com` — this is a runtime dependency, not a build dependency
