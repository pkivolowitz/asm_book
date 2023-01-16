#!/bin/bash
file_list=`git diff --name-only main | grep -i ".md"`
echo $file_list
