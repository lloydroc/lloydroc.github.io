---
title: User Name Search with Apache Lucene
categories: ["java"]
tags: ["lucene"]
comments: true
date: "2020-01-30T10:53:31Z"
---

# {{< title >}}

I wanted to use Apache Lucene to search User Names. It's definitely not straightforward. This post explains how to do it by defining our own custom `Analyzer` and explaining how we form the `Document`, index the user names and query with a `PrefixQuery`.

First of all if you're using Apache Lucene you're my type of person! It's an awesome project, but the documentation and examples are severely lacking.

I recently wanted to index user names as "First Last" and couldn't find the right analyzer to do so. It turns out it's very easy. I should note this is for Lucene version 8.4.0. The problem was that if I index a user's name like "Lloyd Rochester" I was getting issues with the normal analyzer's tokenization of `TextField` and `String`. The problem here is Lucene will not tokenize the `String` field and leave them verbatim as a single Token. When Lucene tokenizes `TextField` the tokens are case sensitive. This applies to the `StandardAnalyzer` and `WhitespaceAnalyzer`. Below we can analyze text like the `WhitespaceAnalyzer` but filter it to lower case. We do this by creating our own `LowerCaseWhitespaceAnalyzer` which extends `Analyzer`.

Let me provide an example for the problem statement:

Lucene Index contains this: 3 names separated by commas:

```Bob Anderson, Vince Bob, Bobby Brown```

I wanted to be able so search for "b" using a `PrefixQuery` and have the following results:

```Bob Anderson, Vince Bob, Bobby Brown```

You could see if the field was `String` and we search for "b" then "Vince Bob" would not show up since "Vince Bob" isn't tokenized as "Vince" and "Bob". Obviously, will have problems with case as well if it's a case sensitive. Searching for names users are not going to upper case them. Here we want a `PrefixQuery` to match both the tokenized first and last name with a case insensitive match.

I ended up doing something like this:

{{< highlight java >}}
Analyzer analyzer = new LowerCaseWhitespaceAnalyzer();
Directory directory = FSDirectory.open(Paths.get("."));
IndexWriterConfig config = new IndexWriterConfig(analyzer);
IndexWriter indexWriter = new IndexWriter(directory,config);
Document doc = null;

doc = new Document();
doc.add(new TextField("name","Bob Anderson", Field.Store.YES));
indexWriter.addDocument(doc);

doc = new Document();
doc.add(new TextField("name","Vince Bob", Field.Store.YES));
indexWriter.addDocument(doc);

doc = new Document();
doc.add(new TextField("name","Bobby Brown", Field.Store.YES));
indexWriter.addDocument(doc);

analyzer.close();
indexWriter.commit();
indexWriter.close();
directory.close();
{{< / highlight >}}

We can now `Query` the index with a `PrefixQuery`:
{{< highlight java >}}
String query = "b";
Query q = null;
Term term = new Term("name", query);
q = new PrefixQuery(term)
{{< / highlight >}}

This query will return Bob Anderson, Vince Bob, and Bobby Brown as we desire.

Finally, the `LowerCaseWhitespaceAnalyzer` is below.

{{< highlight java >}}
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.LowerCaseFilter;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.Tokenizer;
import org.apache.lucene.analysis.core.WhitespaceTokenizer;

public class LowerCaseWhitespaceAnalyzer extends Analyzer {

    @Override
    protected TokenStreamComponents createComponents(String fieldName) {
      Tokenizer source = new WhitespaceTokenizer();
      TokenStream filter = new LowerCaseFilter(source);
      return new TokenStreamComponents(source, filter);
    }

    @Override
    protected TokenStream normalize(String fieldName, TokenStream in) {
      return new LowerCaseFilter(in);
    }

}
{{< / highlight >}}

Happy Searching!

