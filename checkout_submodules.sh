#!/bin/bash
git submodule init
cd userauth
git submodule init
cd ..
git submodule update --recursive
