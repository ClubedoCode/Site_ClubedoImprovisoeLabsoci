interface TopbarProps {
  instagram: string;
}

export default function Topbar({ instagram }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span>Contato: (88) 99999-9999</span>
        <span>Oficinas: Qui às 18hrs / Sex às 15 hrs</span>
      </div>
      <div className="topbar-right">
        <a href={instagram} target="_blank" rel="noopener noreferrer" className="insta">
          Instagram
        </a>
        <a href="https://wa.me/5588999999999" target="_blank" rel="noopener noreferrer">
          YouTube
        </a>
        <a
          href="https://chat.whatsapp.com/HrNYCHjyv0I4OOZAD7ft1E"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>
    </header>
  );
}