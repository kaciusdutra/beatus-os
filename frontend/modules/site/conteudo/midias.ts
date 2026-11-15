// Fotos e publicações que aparecem no site. Enquanto as listas estiverem vazias,
// as seções "Fotos" e "Marcaram o Beatus" não aparecem.
//
// Para colocar uma foto: copie o arquivo para frontend/public/site/ (ex.: agnus.jpg)
// e acrescente aqui { src: "/site/agnus.jpg", alt: "Descrição da foto" }.

export interface FotoDoSite {
  src: string;
  alt: string;
}

export const FOTOS_DO_SITE: FotoDoSite[] = [];

// Publicações de clientes que marcaram o Beatus. Por enquanto são escolhidas à mão
// (com a autorização de quem postou): imagem, quem postou e o link da publicação.
export interface PublicacaoDaRede {
  imagem: string;
  alt: string;
  autor: string;
  link: string;
}

export const PUBLICACOES_DAS_REDES: PublicacaoDaRede[] = [];

// Perfil do Beatus nas redes (quando existir, aparece no rodapé).
export const PERFIL_NAS_REDES: { rede: string; usuario: string; link: string } | null = null;
