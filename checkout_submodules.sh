#!/bin/bash
git submodule init
git submodule update --recursive
cd userauth
git submodule init
cd ..
git submodule update --recursive
