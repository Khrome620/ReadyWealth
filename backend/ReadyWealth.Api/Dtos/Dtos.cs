namespace ReadyWealth.Api.Dtos;

public record PlaceOrderRequest(
    string Ticker,
    string Type,
    decimal Amount,
    string? IdempotencyKey
);

public record PlaceOrderResponse(
    Guid OrderId,
    string Ticker,
    string Type,
    decimal Amount,
    decimal Shares,
    decimal EntryPrice,
    string Status,
    DateTimeOffset PlacedAt,
    decimal WalletBalance
);

public record OrderDto(
    Guid OrderId,
    string Ticker,
    string Type,
    decimal Amount,
    decimal Shares,
    decimal EntryPrice,
    string Status,
    DateTimeOffset PlacedAt,
    DateTimeOffset? ClosedAt
);

public record ClosePositionResponse(
    Guid OrderId,
    string Ticker,
    string Type,
    decimal ClosingPrice,
    decimal RealizedPnl,
    decimal WalletBalance,
    DateTimeOffset ClosedAt
);

public record PositionDto(
    Guid OrderId,
    string Ticker,
    string Type,
    decimal InvestedAmount,
    decimal Shares,
    decimal EntryPrice,
    decimal CurrentPrice,
    decimal CurrentValue,
    decimal UnrealizedPnl,
    decimal UnrealizedPnlPct
);

public record RecommendationDto(
    string Ticker,
    string Name,
    decimal CurrentPrice,
    string Reason,
    string Confidence
);

public record TransactionDto(
    Guid Id,
    Guid OrderId,
    string Ticker,
    string Type,
    decimal Amount,
    string Status,
    decimal? RealizedPnl,
    decimal? ClosingPrice,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record WatchlistItemDto(
    string Ticker,
    string Name,
    decimal Price,
    decimal Change,
    decimal ChangePct,
    long Volume,
    bool IsAutoAdded,
    DateTimeOffset AddedAt
);
