git -C . rev-parse 2> /dev/null

if [ $? -eq 0 ]; then
  git describe --tags --long
else
  echo "default"
fi;