# Copyright 2021 Miles Barr <milesbarr2@gmail.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import argparse
import json
import os
from PIL import Image, ImageOps, ImageDraw
import shutil

parser = argparse.ArgumentParser()
parser.add_argument("--google-api-key", required=True)
parser.add_argument("--google-analytics-measurement-id", required=True)
args = parser.parse_args()

# Create the build directory.
try:
    os.mkdir("build")
except FileExistsError:
    pass

# Build the index page.
with open("index.html") as f:
    index = f.read()
index = index.replace("GOOGLE_API_KEY", args.google_api_key)
index = index.replace(
    "GOOGLE_ANALYTICS_MEASUREMENT_ID",
    args.google_analytics_measurement_id,
)
with open("build/index.html", "w") as f:
    f.write(index)

# Build the not found page.
with open("not-found.html") as f:
    not_found = f.read()
not_found = not_found.replace(
    "GOOGLE_ANALYTICS_MEASUREMENT_ID",
    args.google_analytics_measurement_id,
)
with open("build/not-found.html", "w") as f:
    f.write(not_found)

# Build the script.
with open("script.js") as f:
    script = f.read()
script = script.replace("GOOGLE_API_KEY", args.google_api_key)
with open("build/script.js", "w") as f:
    f.write(script)

# Minify the web app manifest.
with open("manifest.webmanifest") as f:
    manifest = json.load(f)
with open("build/manifest.webmanifest", "w") as f:
    json.dump(manifest, f, separators=(",", ":"))

# Minify the sitemap.
with open("sitemap.xml") as in_file:
    with open("build/sitemap.xml", "w") as out_file:
        for line in in_file:
            out_file.write(line.strip())

# Generate icons.
icon = Image.open("icon.png")

favicon_mask = Image.new(mode="L", size=icon.size, color=0)
ImageDraw.Draw(favicon_mask).ellipse((0, 0) + icon.size, fill=255)
favicon = ImageOps.fit(icon, icon.size)
favicon.putalpha(favicon_mask)
favicon.save(
    "build/favicon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)]
)

icon.resize((57, 57)).save("build/icon-57x57.png", optimize=True)
icon.resize((72, 72)).save("build/icon-72x72.png", optimize=True)
icon.resize((76, 76)).save("build/icon-76x76.png", optimize=True)
icon.resize((114, 114)).save("build/icon-114x114.png", optimize=True)
icon.resize((120, 120)).save("build/icon-120x120.png", optimize=True)
icon.resize((128, 128)).save("build/icon-128x128.png", optimize=True)
icon.resize((144, 144)).save("build/icon-144x144.png", optimize=True)
icon.resize((152, 152)).save("build/icon-152x152.png", optimize=True)
icon.resize((167, 167)).save("build/icon-167x167.png", optimize=True)
icon.resize((180, 180)).save("build/icon-180x180.png", optimize=True)
icon.resize((192, 192)).save("build/icon-192x192.png", optimize=True)
icon.resize((228, 228)).save("build/icon-228x228.png", optimize=True)

# Optimize images.
Image.open("background.png").save("build/background.png", optimize=True)
Image.open("screenshot-1.png").save("build/screenshot-1.png", optimize=True)
Image.open("screenshot-2.png").save("build/screenshot-2.png", optimize=True)
Image.open("screenshot-3.png").save("build/screenshot-3.png", optimize=True)

# Copy files.
shutil.copyfile("style.css", "build/style.css")
shutil.copyfile("loader.gif", "build/loader.gif")
shutil.copyfile("robots.txt", "build/robots.txt")
shutil.copyfile("open-graph-image.png", "build/open-graph-image.png")
shutil.copyfile("twitter-card-image.png", "build/twitter-card-image.png")
