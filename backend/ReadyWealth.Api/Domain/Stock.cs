namespace ReadyWealth.Api.Domain;

public record Stock(
    string Ticker,
    string Name,
    decimal Price,
    decimal Change,
    decimal ChangePct,
    long Volume,
    DateTimeOffset AsOf
);
