---
categories:
  - c
date: "2022-03-29"
title: Freetype Example
draft: true
---

Download tarball:

{{< highlight bash >}}
tar xvf freetype-2.11.1.tar.gz
cd freetype-2.11.1
./autogen.sh
./configure
make
sudo make install
{{< /highlight >}}

{{< highlight bash >}}
$ pkg-config --list-all | grep freetype
freetype2          FreeType 2 - A free, high-quality, and portable font engine
$ pkg-config --cflags freetype2
-I/usr/local/include/freetype2 -I/usr/include/libpng16
$ pkg-config --libs freetype2
-L/usr/local/lib -lfreetype
{{< /highlight >}}

{{< highlight bash >}}
$ wget https://freetype.org/freetype2/docs/tutorial/example1.c
$ cc -I/usr/local/include/freetype2 -lfreetype -lm example1.c
$ ./a.out
{{< /highlight >}}


{{< highlight bash >}}
$ fc-list
/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf: DejaVu Serif:style=Bold
/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf: DejaVu Sans Mono:style=Book
/usr/share/fonts/type1/gsfonts/n021024l.pfb: Nimbus Roman No9 L:style=Medium Italic
/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf: DejaVu Sans:style=Book
/usr/share/fonts/type1/gsfonts/n021004l.pfb: Nimbus Roman No9 L:style=Medium
/usr/share/fonts/type1/gsfonts/p052023l.pfb: URW Palladio L:style=Italic
/usr/share/fonts/type1/gsfonts/n022003l.pfb: Nimbus Mono L:style=Regular
/usr/share/fonts/type1/gsfonts/z003034l.pfb: URW Chancery L:style=Medium Italic
/usr/share/fonts/type1/gsfonts/c059013l.pfb: Century Schoolbook L:style=Roman
/usr/share/fonts/type1/gsfonts/d050000l.pfb: Dingbats:style=Regular
/usr/share/fonts/type1/gsfonts/n021023l.pfb: Nimbus Roman No9 L:style=Regular Italic
/usr/share/fonts/type1/gsfonts/n019063l.pfb: Nimbus Sans L:style=Regular Condensed Italic
/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf: DejaVu Sans:style=Bold
/usr/share/fonts/type1/gsfonts/a010013l.pfb: URW Gothic L:style=Book
/usr/share/fonts/type1/gsfonts/n019064l.pfb: Nimbus Sans L:style=Bold Condensed Italic
/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf: Droid Sans Fallback:style=Regular
/usr/share/fonts/type1/gsfonts/p052004l.pfb: URW Palladio L:style=Bold
/usr/share/fonts/type1/gsfonts/n022023l.pfb: Nimbus Mono L:style=Regular Oblique
/usr/share/fonts/type1/gsfonts/a010015l.pfb: URW Gothic L:style=Demi
/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf: DejaVu Sans Mono:style=Bold
/usr/share/fonts/type1/gsfonts/n019043l.pfb: Nimbus Sans L:style=Regular Condensed
/usr/share/fonts/type1/gsfonts/n019044l.pfb: Nimbus Sans L:style=Bold Condensed
/usr/share/fonts/type1/gsfonts/a010033l.pfb: URW Gothic L:style=Book Oblique
/usr/share/fonts/type1/gsfonts/n021003l.pfb: Nimbus Roman No9 L:style=Regular
/usr/share/fonts/type1/gsfonts/s050000l.pfb: Standard Symbols L:style=Regular
/usr/share/fonts/type1/gsfonts/b018035l.pfb: URW Bookman L:style=Demi Bold Italic
/usr/share/fonts/type1/gsfonts/c059033l.pfb: Century Schoolbook L:style=Italic
/usr/share/fonts/type1/gsfonts/a010035l.pfb: URW Gothic L:style=Demi Oblique
/usr/share/fonts/type1/gsfonts/n019023l.pfb: Nimbus Sans L:style=Regular Italic
/usr/share/fonts/type1/gsfonts/b018012l.pfb: URW Bookman L:style=Light
/usr/share/fonts/truetype/noto/NotoMono-Regular.ttf: Noto Mono:style=Regular
/usr/share/fonts/type1/gsfonts/c059016l.pfb: Century Schoolbook L:style=Bold
/usr/share/fonts/type1/gsfonts/n022004l.pfb: Nimbus Mono L:style=Bold
/usr/share/fonts/type1/gsfonts/n019024l.pfb: Nimbus Sans L:style=Bold Italic
/usr/share/fonts/type1/gsfonts/b018032l.pfb: URW Bookman L:style=Light Italic
/usr/share/fonts/type1/gsfonts/p052003l.pfb: URW Palladio L:style=Roman
/usr/share/fonts/type1/gsfonts/n019004l.pfb: Nimbus Sans L:style=Bold
/usr/share/fonts/type1/gsfonts/b018015l.pfb: URW Bookman L:style=Demi Bold
/usr/share/fonts/type1/gsfonts/n022024l.pfb: Nimbus Mono L:style=Bold Oblique
/usr/share/fonts/type1/gsfonts/c059036l.pfb: Century Schoolbook L:style=Bold Italic
/usr/share/fonts/type1/gsfonts/p052024l.pfb: URW Palladio L:style=Bold Italic
/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf: DejaVu Serif:style=Book
/usr/share/fonts/type1/gsfonts/n019003l.pfb: Nimbus Sans L:style=Regular
{{< /highlight >}}


```
|                                                                                                                               |
|                                                                                                                               |
|+*******  +*******            *****  *****                   ******++******+ ******                     *****        *****     |
|+++***++  +++***++             +***   +***                   ++***+++++***++ ++**++                      +***         +***     |
|   ***      +**+                ***    ***                    +***    +***     **                         ***          ***     |
|   ***      +**+                ***    ***                     ***+    ***    +*+                         ***          ***     |
|   ***      +**+                ***    ***                     +**+   +***+   +*+                         ***          ***     |
|   ***      +**+      +****+    ***    ***     +***++          +***   +****   **      +***++  +***++***+  ***     +***+***     |
|   ***      +**+     **+++**+   ***    ***   +**+++**+          ***+  *+***  +*+    +**+++**+ +***+*****  ***    ***++****     |
|   ************+    +**   +*+   ***    ***   +**   **+          +**+ +*++**+ +*+    +**   **+   **** **+  ***   +**+  +***     |
|   ***+++++++**+    **+   +**+  ***    ***   **+   +**+          *** +* +**+ **     **+   +**+  ***+ +++  ***   ***    ***     |
|   ***      +**+   +**+   +**+  ***    ***  +**+   +**+          ***+**  *** *+    +**+   +**+  ***       ***   **+    ***     |
|   ***      +**+   +*********+  ***    ***  +**+   +**+          +**+*+  +**+*+    +**+   +**+  ***       ***  +**+    ***     |
|   ***      +**+   +**+         ***    ***  +**+   +**+           ****+  +****     +**+   +**+  ***       ***   **+    ***     |
|   ***      +**+   +**+     ++  ***    ***   **+   +**+           ****    ***+      **+   +**+  **+       ***   **+    ***     |
|   ***      +**+    ***+   +*+  ***    ***   +**   +*+            +**+    +**+      +**   +*+   **+       ***   +**+  +***     |
|+++***++  +++***++  +***+++*+   ***    ***   +**+++**+             **+    +**       +**+++**+   **+       ***   +***++****+    |
|+*******  +*******   ++****+  +*****++*****+   +***++              +*      **         +***++  +*****+   +*****+  ++***+****+   |
|                                                                                                                       ++++    |
|                                                                                                                               |
|                                                                                                                               |
|                                                                                                                               |
|                                                                                                                               |
|                                                                                                                               |
|                                                                                                                               |
|                                                                                                                               |
```
