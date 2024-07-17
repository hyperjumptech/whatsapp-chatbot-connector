import {app} from './app';

import "./api/webhook";

const port = 5007;

app.listen(port, () => console.log(`Server ready on port ${port}.`));



