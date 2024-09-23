git -C . rev-parse 2> /dev/null

if [ $? -eq 0 ]; then
  git describe --tags
else
  echo "default"
fi;