#!/bin/sh
set -eu

cat >/tmp/seaweedfs-s3.json <<EOF
{
  "identities": [
    {
      "name": "chatbot",
      "credentials": [
        {
          "accessKey": "${SEAWEEDFS_S3_ACCESS_KEY}",
          "secretKey": "${SEAWEEDFS_S3_SECRET_KEY}"
        }
      ],
      "actions": ["Admin", "Read", "List", "Write", "Tagging"]
    }
  ]
}
EOF

exec weed s3 -filer=seaweedfs-filer:8888 -port=8333 -config=/tmp/seaweedfs-s3.json
