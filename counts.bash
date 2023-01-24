#!/bin/bash
find . -print 2> /dev/null | egrep -i -e ".md" > /tmp/md 2> /dev/null
find . -print 2> /dev/null | egrep -i -e "\.c$" -e "\.cpp$" > /tmp/c 2> /dev/null
find . -print 2> /dev/null | egrep -i -e "\.s$" > /tmp/s 2> /dev/null
echo Text \(words\)
xargs wc -w < /tmp/md 2> /dev/null | tail -n 1
echo C and C++  \(lines\)
xargs wc -l < /tmp/c  2> /dev/null | tail -n 1
echo Assembly Language \(lines\)
xargs wc -l < /tmp/s  2> /dev/null | tail -n 1
