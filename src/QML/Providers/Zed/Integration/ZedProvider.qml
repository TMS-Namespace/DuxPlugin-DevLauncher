// ZedProvider.qml - Expose the Zed history reader through the shared provider boundary.
// Rules: Declares only the reader component for Zed; it reads no history and imports only its own folder and the shared contracts.
import QtQml
import "../../../Contracts"
import ".."
// Declares the reader component that the facade creates on first use.
ProviderBase { readerType: Component { ZedRecents {} } }
