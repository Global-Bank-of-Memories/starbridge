package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/stellar/go/support/render/problem"
	"github.com/stellar/starbridge/backend"
	"github.com/stellar/starbridge/ethereum"
	"github.com/stellar/starbridge/store"
)

type EthereumSignatureResponse struct {
	Address    string `json:"address"`
	Signature  string `json:"signature"`
	DepositID  string `json:"deposit_id"`
	Expiration int64  `json:"expiration,string"`
	Token      string `json:"token"`
	Amount     string `json:"amount"`
}

type EthereumRefundHandler struct {
	Observer                ethereum.Observer
	Store                   *store.DB
	EthereumRefundValidator backend.EthereumRefundValidator
	EthereumFinalityBuffer  uint64
}

func (c *EthereumRefundHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	deposit, err := getEthereumDeposit(c.Observer, c.Store, c.EthereumFinalityBuffer, r)
	if err != nil {
		problem.Render(r.Context(), w, err)
		return
	}

	// Check if outgoing transaction exists
	row, err := c.Store.GetEthereumSignature(r.Context(), store.Refund, deposit.ID)
	if err != nil && err != sql.ErrNoRows {
		problem.Render(r.Context(), w, err)
		return
	}
	if err == nil {
		responseBytes, err := json.Marshal(EthereumSignatureResponse{
			Address:    row.Address,
			Signature:  row.Signature,
			DepositID:  row.DepositID,
			Expiration: row.Expiration,
			Token:      row.Token,
			Amount:     row.Amount,
		})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
		} else {
			_, _ = w.Write(responseBytes)
		}
		return
	}

	if err = c.EthereumRefundValidator.CanRefund(r.Context(), deposit); err != nil {
		problem.Render(r.Context(), w, err)
		return
	}

	err = c.Store.InsertSignatureRequest(r.Context(), store.SignatureRequest{
		WithdrawChain: store.Stellar,
		DepositChain:  store.Ethereum,
		Action:        store.Refund,
		DepositID:     deposit.ID,
	})
	if err != nil {
		problem.Render(r.Context(), w, err)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}
