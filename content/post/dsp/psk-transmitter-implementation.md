---
title: BPSK Transmitter Implementation
date: "2021-01-24"
math: true
categories:
 - dsp
 - psk
---

# {{ <title> }}

In the previous post we discussed [BPSK Transmit Theory](/post/dsp/psk-transmit-theory/). This post will discuss the implementation of it. This implementation will be in the C programming language and it will also be a command line tool.

# PSK Series

I'm doing a series on PSK here is where we are:
1. [BPSK Transmit Theory](/post/dsp/psk-transmit-theory/) - This post shows graphs and has audio files of what this tool does.
2. [BPSK Implementation](/post/dsp/psk-transmitter-implementation/) - This Post.
3. BPSK Receiver Theory - Coming Soon
4. BPSK Receiver Theory - Coming Soon
5. QPSK - Coming Soon

# Using the Command Line Tool

I like to start out with how the tool is used as it gives insight about the implementation. It's quite simple, provide text input as a program argument and the tool will output a `.wav` file with the content. The example below converts the text `hello world` to the `psk31.wav` audio file.

{{< highlight bash >}}
$ ./bpsk31tx --wavfile psk31.wav "hello world"
hello world -> 1010110011001101100110110011100100110101100111001010100110110010110100
$ ls -l psk31.wav
-rw-r--r-- 1 lloydroc lloydroc 4500044 Jan 24 14:38 psk31.wav
{{< / highlight >}}

# What the Implementation Doesn't Do

The scope here could be very large. This is a blog post so we need to keep it simple. We will merely be converting text into PCM data. I've chosen to put this PCM data into an audio `.wav` file as this makes the program portable. Interfacing with a sound card and other audio formats is something I'd like to write about later.

Also, it would be nice to have this program run in the background and have clients connect to it. This way you don't need to write in C and other programs could merely send it text. The background process would handle transmission of BPSK out of the sound interface. This is something that could be built in later.

# Program Options

I've built in a number of options. Most of these options deal with tweaking the transmission characteristics and debugging. When building a transmitter, especially in C, you need to be able to graph waveforms along the way. I dump out data to `.csv` and use `gnuplot` to graph them.

{{< highlight text >}}
$ ./bpsk31tx

Usage: psk31tx [OPTIONS] TEXT

Options:
-h, --help                  Print this menu
--wavfile FILE              Output .wav file [psk31.wav]
--csvfile FILE              Output .csv file
--symbol-frequency DECIMAL  Symbol Frequency [31.25]
--sample-frequency INTEGER  Sample Frequency [8000]
--cycles-per-symbol INTEGER Cycles Per Symbol [16]
--bits-per-sample INTEGER   Bits for Every Sample [16]
--matched-filter TYPE       Matched filter: none or rrc for Root Raised Cosine [rrc]

Debugging Options:
--debug-transmission-csv FILE    Write samples going to the sound card to CSV
--debug-carrier-float-csv FILE   Write the Carriers for Each Symbol to CSV
--debug-carrier-integer-csv FILE Write the Carriers quantized to Integers to CSV
--debug-matched-float-csv FILE   Write the matched filter to CSV
{{< / highlight >}}

# The Overall Implementation Process

The overall implementation process for a BPSK Transmitter will be the following:

1. Take program input as text
2. Map the text to our code alphabet of 0's and 1's
3. Convert 0's and 1's to our symbols
4. Convert symbols into PCM Data
5. Write the PCM Data to a file

# The PSK Structure

The heart of the program is a structure that contains all the information to create a BPSK transmission.

{{< highlight c >}}
/* Handle BPSK and QPSK */
struct PSK
{
  /* characteristics of PSK */
  struct options *opts;
  int phases; // 2 for bpsk and 4 for qpsk
  int bytes_per_sample;
  int samples_per_symbol;
  float ts;
  float symbol_duration;
  float carrier_amplitude;
  float carrier_frequency;

  /* coding from text to binary */
  const char (*alphabet)[11];
  char *text_encoded;
  size_t symbols_len;
  char *symbols;

  /* symbol construction */
  struct cosine cos_i;
  struct cosine cos_q;
  struct cosine sin_i; // unused for bpsk
  struct cosine sin_q; // unused for bpsk

  float *matched_filter;
  size_t matched_filter_length;

  float* carrier_0i;
  float* carrier_1i;
  float* carrier_0q; // unused for bpsk
  float* carrier_1q; // unused for bpsk

  /* quantized carrier data */
  int8_t* carrier_0i_q;
  int8_t* carrier_1i_q;
  int8_t* carrier_0q_q; // unused for bpsk
  int8_t* carrier_1q_q; // unused for bpsk

  /* PCM Data for the final output */
  int8_t *transmission; // the int8_t can support 8, 16 and 24 bit quantization
  ssize_t transmission_num_samples;
  ssize_t transmission_num_bytes;
};
{{< / highlight >}}

We will make function calls to operate on the `struct PSK` and use it to take our input text, encode it, and phase key it. To initialize this structure we have a function called `bpsk31_init` in the `bpsk31.h` and `bpsk31.c` files.

# Program Options

We need a number of options to control the characteristics of PSK. Here is our structure to do so:

{{< highlight c >}}
enum MATCHED_FILTER
{
  NONE,
  ROOT_RAISED_COSINE
};

struct options {
    int help;
    char *wavfile;
    char *debug_transmission_csvfile;
    char *debug_carrier_float_csvfile;
    char *debug_carrier_integer_csvfile;
    char *debug_matched_float_csvfile;
    float symbol_frequency;
    uint32_t sample_frequency;
    float cycles_per_symbol;
    uint8_t bits_per_sample;
    uint8_t num_phases;
    char *text;
    enum MATCHED_FILTER matched_filter;
    int error;
};
{{< / highlight >}}

We keep a pointer to these options in the `struct PSK`. Note, that BPSK31 is just a usage of the options.

# BPSK Alphabet

Here is the BPSK Alphabet in C. It is is used to convert text to 0's and 1's. I had originally stored the varicode in binary, however, string matching becomes easier when using `char` arrays.

For this alphabet we don't have in the "rest", or "delimiter" which is a double `00` after each code word. The order of the alphabet is the same as ASCII so a character in `c` directly maps to the index in the alphabet.

{{< highlight c >}}
const char ALPHABET[128][11] = {
  "1010101011", // NUL
  "1011011011", // SOH
  "1011101101", // STX
  "1101110111", // ETX
  "1011101011", // EOT
  "1101011111", // ENQ
  "1011101111", // ACK
  "1011111101", // BEL
  "1011111111", // BS
  "11101111", // HT
  "11101", // LF
  "1101101111", // VT
  "1011011101", // FF
  "11111", // CR
  "1101110101", // SO
  "1110101011", // SI
  "1011110111", // DLE
  "1011110101", // DC1
  "1110101101", // DC2
  "1110101111", // DC3
  "1101011011", // DC4
  "1101101011", // NAK
  "1101101101", // SYN
  "1101010111", // ETB
  "1101111011", // CAN
  "1101111101", // EM
  "1110110111", // SUB
  "1101010101", // ESC
  "1101011101", // FS
  "1110111011", // GS
  "1011111011", // RS
  "1101111111", // US
  "1", // SP
  "11111111", // !
  "101011111", // "
  "111110101", // #
  "111011011", // $
  "1011010101", // %
  "1010111011", // &
  "101111111", // '
  "11111011", // (
  "11110111", // )
  "101101111", // *
  "111011111", // +
  "1110101", // ,
  "110101", // -
  "1010111", // .
  "110101111", // /
  "10110111", // 0
  "10111101", // 1
  "11101101", // 2
  "11111111", // 3
  "101110111", // 4
  "101011011", // 5
  "101101011", // 6
  "110101101", // 7
  "110101011", // 8
  "110110111", // 9
  "11110101", // :
  "110111101", // ;
  "111101101", // <
  "1010101", // =
  "111010111", // >
  "1010101111", // ?
  "1010111101", // @
  "1111101", // A
  "11101011", // B
  "10101101", // C
  "10110101", // D
  "1110111", // E
  "11011011", // F
  "11111101", // G
  "101010101", // H
  "1111111", // I
  "111111101", // J
  "101111101", // K
  "11010111", // L
  "10111011", // M
  "11011101", // N
  "10101011", // O
  "11010101", // P
  "111011101", // Q
  "10101111", // R
  "1101111", // S
  "1101101", // T
  "101010111", // U
  "110110101", // V
  "101011101", // W
  "101110101", // X
  "101111011", // Y
  "1010101101", // Z
  "111110111", // [
  "111101111", // back slash
  "111111011", // ]
  "1010111111", // ^
  "101101101", // _
  "1011011111", // `
  "1011", // a
  "1011111", // b
  "101111", // c
  "101101", // d
  "11", // e
  "111101", // f
  "1011011", // g
  "101011", // h
  "1101", // i
  "111101011", // j
  "10111111", // k
  "11011", // l
  "111011", // m
  "1111", // n
  "111", // o
  "111111", // p
  "110111111", // q
  "10101", // r
  "10111", // s
  "101", // t
  "110111", // u
  "1111011", // v
  "1101011", // w
  "11011111", // x
  "1011101", // y
  "111010101", // z
  "1010110111", // {
  "110111011", // |
  "1010110101", // }
  "1011010111", // ~
  "1110110101" // DEL
};
{{< / highlight >}}

# Encoding Text from the Alphabet

We need to use the alphabet to encode our text using the alphabet. The result will be 0's and 1's. We will insert the rest between characters.

{{< highlight c >}}
int
bpsk31_encode_text(struct PSK *bpsk31, char *text)
{
  const size_t N = strlen(text);

  // generously allocate memory for the symbols
  // each symbol is 10 chars plus 2 0's for a rest and a NULL
  bpsk31->text_encoded = malloc(N*13);
  if(bpsk31->text_encoded == NULL)
  {
     fprintf(stderr, "out of memory\n");
     return 1;
  }

  // make string zero length
  bpsk31->text_encoded[0] = '\0';

  for(int i=0; i<N; i++)
  {
    int index = text[i];
    const char *alpha = bpsk31->alphabet[index];
    strcat(bpsk31->text_encoded, alpha);
    // insert the rest between characters
    strcat(bpsk31->text_encoded, "00");
  }

  // allocate memory for the in-phase symbols
  bpsk31->symbols_len = strlen(bpsk31->text_encoded);
  bpsk31->symbols = malloc(bpsk31->symbols_len);
  if(bpsk31->symbols == NULL)
  {
     fprintf(stderr, "out of memory\n");
     return 1;
  }

  // convert ascii to numbers that are chars
  for(int i=0; i<bpsk31->symbols_len; i++)
  {
    if(bpsk31->text_encoded[i] == '0')
      bpsk31->symbols[i] = 0;
    else
      bpsk31->symbols[i] = 1;
  }

  return 0;
}
{{< / highlight >}}

# BPSK Symbol Creation

Now we have 1's and 0's encoded from our text. We then need to map our symbol waveforms to each of those. Each symbol waveform spans multiple symbol durations since the we're using a Root Raised Cosine. Thus, we have account for overlap which makes things more complex.

It's easiest to create a memory buffer set to zero and use pointers to move the symbol waveforms in. Since each symbol overlaps it makes it more complex where we need to perform addition on the overlap case.

{{< highlight c >}}
int
bpsk31_make_transmission(struct PSK *bpsk31)
{
  size_t num_symbols;
  int8_t* dest_ptr;
  int8_t* source_ptr;

  // how many bytes are in one symbol period
  // this excludes if a matched filter bleeds
  // into another period
  size_t bytes_per_symbol;

  int overlaps, overlap_samples;

  num_symbols = bpsk31->symbols_len;
  if(num_symbols < 1)
    return 0;

  bytes_per_symbol = bpsk31->samples_per_symbol*bpsk31->bytes_per_sample;

  overlaps = bpsk31->symbols_len-1;
  overlap_samples = bpsk31->cos_i.num_samples - bpsk31->samples_per_symbol;
  //overlap = overlap_samples*bpsk31->bytes_per_sample;

  bpsk31->transmission_num_samples = bpsk31->cos_i.num_samples*num_symbols-overlaps*overlap_samples;
  bpsk31->transmission_num_bytes = bpsk31->transission_num_samples * bpsk31->bytes_per_sample;
  bpsk31->transmission = calloc(bpsk31->transmission_num_samples, bpsk31->bytes_per_sample);

  dest_ptr = bpsk31->transmission;

  if(bpsk31->opts->matched_filter)
    memset(dest_ptr, 0, bpsk31->transmission_num_bytes);

  for(int i=0; i<num_symbols; i++)
  {
    if(bpsk31->symbols[i] == 0)
      source_ptr = bpsk31->carrier_0i_q;
    else
      source_ptr = bpsk31->carrier_1i_q;

    if(bpsk31->opts->matched_filter)
    {
      // TODO assuming 2 bytes per sample
      int16_t *dest_ptr_16 = (int16_t *) dest_ptr;
      int16_t *source_ptr_16 = (int16_t *) source_ptr;
      for(int j=0; j<bpsk31->cos_i.num_bytes/bpsk31->bytes_per_sample; j++)
      {
        dest_ptr_16[j] += source_ptr_16[j];
      }
      dest_ptr += bytes_per_symbol;
    }
    else
    {
      memcpy(dest_ptr, source_ptr, bpsk31->cos_i.num_bytes);
      dest_ptr += bpsk31->cos_i.num_bytes;
    }
  }

  return 0;
}
{{< / highlight >}}

# Source

I'm going to hold off on providing the full source until we work on the receive side of BPSK. I have a number of code clean-up items at this point to complete the series with the receiver. Drop a comment or email me if you need it.
