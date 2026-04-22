use std::io::Write;

use rand::prelude::*;

static WORDS_RAW: &str = include_str!("words.txt");

fn words() -> impl Iterator<Item = &'static str> {
    WORDS_RAW.split(' ')
}

fn is_heterogram(w: &str) -> bool {
    let chars: Vec<char> = w.chars().collect();
    let unique: std::collections::HashSet<char> = chars.iter().copied().collect();
    chars.len() == unique.len()
}

fn pick_letters<'a>(rng: &mut impl Rng, heterograms: &[&'a str]) -> Option<(&'a str, &'a str, String)> {
    let first = heterograms.choose(rng)?;
    let first_chars: Vec<char> = first.chars().collect();
    let last_char = *first_chars.last()?;

    let remaining: Vec<&str> = heterograms
        .iter()
        .copied()
        .filter(|w| {
            let wc: Vec<char> = w.chars().collect();
            let combined: String = first.chars().chain(w.chars()).collect();
            let unique_count = combined.chars().collect::<std::collections::HashSet<_>>().len();
            wc.first().copied() == Some(last_char)
                && first_chars.len() + wc.len() - 1 == 12
                && combined.len() - 1 == unique_count
        })
        .collect();

    let second = remaining.choose(rng)?;
    let combined: String = first
        .chars()
        .chain(second.chars().skip(1))
        .collect();
    Some((first, second, combined))
}

fn generate_edges(rng: &mut impl Rng, letters: &str) -> Option<[String; 4]> {
    let mut edges: [String; 4] = Default::default();
    let mut last_index: Option<usize> = None;

    for ch in letters.chars() {
        let choices: Vec<usize> = (0..4)
            .filter(|&i| Some(i) != last_index && edges[i].len() < 3)
            .collect();
        let edge_index = *choices.choose(rng)?;
        last_index = Some(edge_index);
        edges[edge_index].push(ch);
    }

    Some(edges)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let output_path = args
        .windows(2)
        .find(|w| w[0] == "--output")
        .map(|w| &w[1]);

    let mut rng = rand::rng();

    let heterograms: Vec<&str> = words().filter(|w| is_heterogram(w)).collect();

    let (first, second, edges) = loop {
        if let Some((first, second, letters)) = pick_letters(&mut rng, &heterograms) {
            if let Some(edges) = generate_edges(&mut rng, &letters) {
                break (first, second, edges);
            }
        }
    };

    let output = edges.join("");

    println!("Today's letters: {}, {} => {}", first, second, output);

    match output_path {
        Some(path) => std::fs::File::create(path)
            .and_then(|mut f| f.write_all(output.as_bytes()))
            .expect("failed to write output file"),
        None => print!("{}", output),
    }
}
