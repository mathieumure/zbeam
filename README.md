# ZBEAM

ZBeam is a CLI which helps you to automate the creation of invoice report at Zenika.

## Usage

To download an invoice

```
npx zbeam download
```

To create an expense report from a downloaded invoice

```
npx zbeam report <your file>
```

example

```
npx zbeam report ./invoices/2021-05-14.99.pdf
```

Your file must follow this synthax

```
<year>-<month>-<amount with dot>.<extension>
```

Display usage

```
npx zbeam --help
```

## Supported Provider

- Bouygues

## TODO

- [ ] Release process
- [ ] Sosh provider
- [ ] SFR provider
